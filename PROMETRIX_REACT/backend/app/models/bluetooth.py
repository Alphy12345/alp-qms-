#!/usr/bin/env python
"""
Bluetooth device management using bleak library.
Handles scanning, connecting, and managing Bluetooth devices.
"""

import asyncio
from typing import List, Dict, Optional, Callable, Any
from bleak import BleakScanner, BleakClient
from bleak.backends.device import BLEDevice
from bleak.backends.scanner import AdvertisementData
import logging
import platform

logger = logging.getLogger(__name__)

class BluetoothManager:
    """Manages Bluetooth device operations using bleak."""
    
    def __init__(self):
        self.connected_devices: Dict[str, BleakClient] = {}
        self.discovered_devices: List[Dict] = []
        self._scanning = False
        
    def _detection_callback(self, device: BLEDevice, advertisement_data: AdvertisementData):
        """Callback for when a device is detected during scanning."""
        device_info = {
            "address": device.address,
            "name": device.name or advertisement_data.local_name or "Unknown Device",
            "rssi": device.rssi,
            "uuids": list(advertisement_data.service_uuids),
            "manufacturer_data": dict(advertisement_data.manufacturer_data),
            "tx_power": advertisement_data.tx_power,
            "is_connectable": advertisement_data.is_connectable,
            "platform_data": getattr(device, 'details', {})
        }
        
        # Check if device already exists in list
        existing = next((d for d in self.discovered_devices if d["address"] == device.address), None)
        if existing:
            # Update with stronger signal if found again
            if device.rssi and (existing.get("rssi") is None or device.rssi > existing["rssi"]):
                existing["rssi"] = device.rssi
                existing["name"] = device_info["name"]  # Update name if we got a better one
            return
            
        self.discovered_devices.append(device_info)
        logger.info(f"Detected device: {device_info['name']} ({device.address}) - RSSI: {device.rssi}dBm")
    
    async def scan_devices(self, timeout: float = 15.0) -> List[Dict]:
        """
        Scan for nearby Bluetooth devices with improved detection.
        
        Args:
            timeout: Scanning timeout in seconds (default: 15.0 for better detection)
            
        Returns:
            List of discovered devices with their information
        """
        import asyncio
        
        self.discovered_devices = []
        self._scanning = True
        
        try:
            logger.info(f"Starting Bluetooth scan for {timeout} seconds...")
            
            # Create scanner with callback for real-time detection
            scanner = BleakScanner(
                detection_callback=self._detection_callback,
                scanning_mode="active"
            )
            
            # Use the scanner as an async context manager for proper cleanup
            async with scanner:
                # Scan for the specified duration
                await asyncio.sleep(timeout)
                # At this point, the scanner has been collecting devices
            
            logger.info(f"Scan complete. Found {len(self.discovered_devices)} devices")
            return self.discovered_devices
            
        except asyncio.TimeoutError:
            logger.warning("Scan timed out")
            return self.discovered_devices
        except Exception as e:
            logger.error(f"Error scanning for devices: {e}")
            return self.discovered_devices
        finally:
            self._scanning = False
    
    async def scan_with_retry(self, attempts: int = 2, timeout_per_scan: float = 10.0) -> List[Dict]:
        """
        Scan multiple times to catch devices that might not advertise continuously.
        
        Args:
            attempts: Number of scan attempts
            timeout_per_scan: Timeout for each scan attempt
            
        Returns:
            Combined list of all discovered devices
        """
        all_devices = []
        seen_addresses = set()
        
        for attempt in range(attempts):
            logger.info(f"Scan attempt {attempt + 1}/{attempts}")
            devices = await self.scan_devices(timeout=timeout_per_scan)
            
            for device in devices:
                if device["address"] not in seen_addresses:
                    seen_addresses.add(device["address"])
                    all_devices.append(device)
            
            if attempt < attempts - 1:
                logger.info("Waiting before next scan attempt...")
                await asyncio.sleep(2)  # Brief pause between scans
        
        self.discovered_devices = all_devices
        return all_devices
    
    def get_bluetooth_adapter_info(self) -> Dict:
        """Get detailed information about the Bluetooth adapter and radio state."""
        try:
            system = platform.system()
            info = {
                "platform": system,
                "python_version": platform.python_version(),
                "scanning": self._scanning,
                "timestamp": asyncio.get_event_loop().time() if hasattr(asyncio, 'get_event_loop') else None
            }
            
            if system == "Windows":
                try:
                    import winrt.windows.devices.bluetooth as winbt
                    import winrt.windows.devices.radios as radios
                    info["winrt_available"] = True
                    
                    # Get Bluetooth adapter info
                    try:
                        # Check if we can access the default Bluetooth adapter
                        adapter = winbt.BluetoothAdapter.get_default_async()
                        # Note: This is async but we're in sync context, so we'll just note it's available
                        info["bluetooth_adapter_accessible"] = True
                    except Exception as e:
                        info["bluetooth_adapter_accessible"] = False
                        info["bluetooth_adapter_error"] = str(e)
                    
                    # Try to get radio states
                    try:
                        radio_selector = radios.Radio.get_device_selector()
                        info["radio_selector_available"] = True
                    except Exception as e:
                        info["radio_selector_available"] = False
                        info["radio_selector_error"] = str(e)
                        
                except ImportError as e:
                    info["winrt_available"] = False
                    info["winrt_error"] = str(e)
                except Exception as e:
                    info["winrt_error"] = str(e)
            
            # Check bleak scanner availability
            try:
                scanner = BleakScanner()
                info["bleak_scanner_available"] = True
            except Exception as e:
                info["bleak_scanner_available"] = False
                info["bleak_scanner_error"] = str(e)
            
            return info
        except Exception as e:
            logger.error(f"Error getting adapter info: {e}")
            return {"error": str(e), "platform": platform.system()}
    
    async def get_paired_devices(self) -> List[Dict[str, Any]]:
        """List paired/known Bluetooth devices (Windows only) with detailed diagnostics."""
        if platform.system() != "Windows":
            return []

        devices: List[Dict[str, Any]] = []
        diagnostics = {
            "winrt_import_success": False,
            "classic_query_success": False,
            "ble_query_success": False,
            "errors": []
        }

        try:
            from winrt.windows.devices.bluetooth import BluetoothDevice, BluetoothLEDevice
            from winrt.windows.devices.enumeration import DeviceInformation, DeviceInformationKind
            diagnostics["winrt_import_success"] = True
        except Exception as e:
            diagnostics["errors"].append(f"WinRT import failed: {e}")
            logger.warning(f"WinRT not available: {e}")
            return [{"_diagnostics": diagnostics}]

        seen_ids: set[str] = set()

        # Try to get paired BLE devices using a different approach
        try:
            # Use get_device_selector_from_pairing_state with True parameter
            le_selector = BluetoothLEDevice.get_device_selector_from_pairing_state(True)
            logger.info(f"BLE paired selector: {le_selector}")
            le_infos = await DeviceInformation.find_all_async(le_selector)
            diagnostics["ble_count"] = len(le_infos)
            diagnostics["ble_query_success"] = True
            logger.info(f"Found {len(le_infos)} paired BLE devices")
            
            for di in le_infos:
                if di.id in seen_ids:
                    continue
                seen_ids.add(di.id)
                device_info = {
                    "id": di.id,
                    "name": di.name or "Unknown BLE Device",
                    "kind": "ble",
                    "is_paired": True,
                }
                # Try to get address
                try:
                    le = await BluetoothLEDevice.from_id_async(di.id)
                    if le is not None:
                        device_info["address"] = str(le.bluetooth_address)
                        device_info["connection_status"] = str(le.connection_status)
                except Exception as e:
                    logger.warning(f"Could not get BLE device details: {e}")
                devices.append(device_info)
        except Exception as e:
            diagnostics["errors"].append(f"BLE paired query failed: {e}")
            logger.warning(f"Failed listing paired BLE devices: {e}")
            
        # Try to get all BLE devices (not just paired) - this might show connected devices
        if not devices:
            try:
                # Try the simple selector first
                le_selector = BluetoothLEDevice.get_device_selector()
                logger.info(f"BLE all selector: {le_selector}")
                le_infos = await DeviceInformation.find_all_async(le_selector)
                diagnostics["ble_all_count"] = len(le_infos)
                diagnostics["ble_all_success"] = True
                logger.info(f"Found {len(le_infos)} total BLE devices")
                
                for di in le_infos:
                    if di.id in seen_ids:
                        continue
                    seen_ids.add(di.id)
                    device_info = {
                        "id": di.id,
                        "name": di.name or "Unknown BLE Device",
                        "kind": "ble",
                        "is_paired": getattr(di, 'is_paired', None),
                    }
                    # Try to get address
                    try:
                        le = await BluetoothLEDevice.from_id_async(di.id)
                        if le is not None:
                            device_info["address"] = str(le.bluetooth_address)
                            device_info["connection_status"] = str(le.connection_status)
                    except Exception as e:
                        logger.warning(f"Could not get BLE device details: {e}")
                    devices.append(device_info)
            except Exception as e:
                diagnostics["errors"].append(f"BLE all query failed: {e}")
                logger.warning(f"Failed listing all BLE devices: {e}")

        # Try Classic Bluetooth
        try:
            # Use paired state selector if available
            classic_selector = BluetoothDevice.get_device_selector_from_pairing_state(True)
            logger.info(f"Classic paired selector: {classic_selector}")
            classic_infos = await DeviceInformation.find_all_async(classic_selector)
            diagnostics["classic_count"] = len(classic_infos)
            diagnostics["classic_query_success"] = True
            logger.info(f"Found {len(classic_infos)} paired classic Bluetooth devices")
            
            for di in classic_infos:
                if di.id in seen_ids:
                    continue
                seen_ids.add(di.id)
                device_info = {
                    "id": di.id,
                    "name": di.name or "Unknown Classic Device",
                    "kind": "classic",
                    "is_paired": True,
                }
                # Try to get address
                try:
                    bt = await BluetoothDevice.from_id_async(di.id)
                    if bt is not None:
                        device_info["address"] = str(bt.bluetooth_address)
                        device_info["connection_status"] = str(bt.connection_status)
                except Exception as e:
                    logger.warning(f"Could not get classic device details: {e}")
                devices.append(device_info)
        except Exception as e:
            diagnostics["errors"].append(f"Classic query failed: {e}")
            logger.warning(f"Failed listing classic Bluetooth devices: {e}")
            
        # Try all classic devices if no paired ones found
        if not devices:
            try:
                classic_selector = BluetoothDevice.get_device_selector()
                logger.info(f"Classic all selector: {classic_selector}")
                classic_infos = await DeviceInformation.find_all_async(classic_selector)
                diagnostics["classic_all_count"] = len(classic_infos)
                diagnostics["classic_all_success"] = True
                logger.info(f"Found {len(classic_infos)} total classic Bluetooth devices")
                
                for di in classic_infos:
                    if di.id in seen_ids:
                        continue
                    seen_ids.add(di.id)
                    device_info = {
                        "id": di.id,
                        "name": di.name or "Unknown Classic Device",
                        "kind": "classic",
                        "is_paired": getattr(di, 'is_paired', None),
                    }
                    # Try to get address
                    try:
                        bt = await BluetoothDevice.from_id_async(di.id)
                        if bt is not None:
                            device_info["address"] = str(bt.bluetooth_address)
                            device_info["connection_status"] = str(bt.connection_status)
                    except Exception as e:
                        logger.warning(f"Could not get classic device details: {e}")
                    devices.append(device_info)
            except Exception as e:
                diagnostics["errors"].append(f"Classic all query failed: {e}")
                logger.warning(f"Failed listing all classic devices: {e}")

        # Attach diagnostics to first device or return separately
        if devices:
            devices[0]["_diagnostics"] = diagnostics
            return devices
        else:
            return [{"_diagnostics": diagnostics, "note": "No paired/known devices found. Check Windows Bluetooth settings."}]
    
    async def connect_device(self, address: str) -> Dict:
        """
        Connect to a Bluetooth device.
        
        Args:
            address: Device address to connect to
            
        Returns:
            Connection status and device info
        """
        try:
            if address in self.connected_devices:
                return {
                    "success": False,
                    "message": "Device already connected",
                    "address": address
                }
            
            logger.info(f"Connecting to device: {address}")
            client = BleakClient(address)
            
            await client.connect()
            
            if client.is_connected:
                self.connected_devices[address] = client
                device_info = {
                    "address": address,
                    "name": client.address,
                    "connected": True,
                    "services": []
                }
                
                # Get services
                try:
                    services = await client.get_services()
                    device_info["services"] = [str(service.uuid) for service in services]
                except Exception as e:
                    logger.warning(f"Could not get services for {address}: {e}")
                
                logger.info(f"Successfully connected to {address}")
                return {
                    "success": True,
                    "message": "Device connected successfully",
                    "device": device_info
                }
            else:
                return {
                    "success": False,
                    "message": "Failed to connect to device",
                    "address": address
                }
                
        except Exception as e:
            logger.error(f"Error connecting to device {address}: {e}")
            return {
                "success": False,
                "message": f"Connection error: {str(e)}",
                "address": address
            }
    
    async def disconnect_device(self, address: str) -> Dict:
        """
        Disconnect from a Bluetooth device.
        
        Args:
            address: Device address to disconnect
            
        Returns:
            Disconnection status
        """
        try:
            if address not in self.connected_devices:
                return {
                    "success": False,
                    "message": "Device not connected",
                    "address": address
                }
            
            client = self.connected_devices[address]
            await client.disconnect()
            
            if not client.is_connected:
                del self.connected_devices[address]
                logger.info(f"Successfully disconnected from {address}")
                return {
                    "success": True,
                    "message": "Device disconnected successfully",
                    "address": address
                }
            else:
                return {
                    "success": False,
                    "message": "Failed to disconnect device",
                    "address": address
                }
                
        except Exception as e:
            logger.error(f"Error disconnecting from device {address}: {e}")
            return {
                "success": False,
                "message": f"Disconnection error: {str(e)}",
                "address": address
            }
    
    def get_connected_devices(self) -> List[Dict]:
        """
        Get list of currently connected devices.
        
        Returns:
            List of connected device information
        """
        connected_devices = []
        for address, client in list(self.connected_devices.items()):
            if client.is_connected:
                device_info = {
                    "address": address,
                    "name": f"Device {address[:8]}...",
                    "connected": True
                }
                connected_devices.append(device_info)
            else:
                # Remove disconnected devices from the list
                del self.connected_devices[address]
        
        return connected_devices
    
    def get_discovered_devices(self) -> List[Dict]:
        """
        Get list of discovered devices from last scan.
        
        Returns:
            List of discovered device information
        """
        return self.discovered_devices

    async def get_system_connected_devices(self) -> List[Dict[str, Any]]:
        """Get devices that are currently connected via Windows Bluetooth settings using PowerShell."""
        if platform.system() != "Windows":
            return []
        
        devices = []
        try:
            import subprocess
            import json
            import re
            
            # Use PnP query to get Bluetooth devices
            ps_command = """
            Get-PnpDevice -Class Bluetooth | Where-Object {$_.Status -eq 'OK' -and $_.FriendlyName -notlike '*Bluetooth*Radio*'} | Select-Object FriendlyName, InstanceId, Status | ConvertTo-Json -Depth 3
            """
            
            result = subprocess.run(
                ["powershell", "-NoProfile", "-Command", ps_command],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0 and result.stdout.strip():
                try:
                    bt_devices = json.loads(result.stdout)
                    if isinstance(bt_devices, dict):
                        bt_devices = [bt_devices]
                    
                    for dev in bt_devices:
                        name = dev.get('FriendlyName', '')
                        instance_id = dev.get('InstanceId', '')
                        
                        # Extract MAC address from InstanceId (format: BTHENUM\DEV_xxxxxxxxxxxx)
                        addr_match = re.search(r'BTHENUM\\\w+_([0-9A-Fa-f]{12})', instance_id)
                        addr = None
                        if addr_match:
                            raw_addr = addr_match.group(1).upper()
                            addr = ':'.join([raw_addr[i:i+2] for i in range(0, 12, 2)])
                        
                        if name and 'radio' not in name.lower() and 'adapter' not in name.lower():
                            device_info = {
                                "name": name,
                                "id": instance_id,
                                "status": dev.get('Status', 'Unknown'),
                                "source": "windows_pnp",
                                "kind": "classic",
                                "connection_type": "windows_connected"
                            }
                            if addr:
                                device_info["address"] = addr
                            devices.append(device_info)
                except json.JSONDecodeError:
                    logger.warning("Failed to parse PowerShell output")
                    
        except Exception as e:
            logger.warning(f"Failed to get system connected devices: {e}")
        
        # Filter out system services
        filtered_devices = []
        system_keywords = [
            'avrcp', 'transport', 'personal area network', 'nap service', 
            'enumerator', 'protocol', 'tdi', 'bluetooth device', 'service',
            'hands-free', 'a2dp', 'audio', 'sink', 'source', 'remote'
        ]
        
        for device in devices:
            name_lower = device.get('name', '').lower()
            if any(keyword in name_lower for keyword in system_keywords):
                continue
            if device.get('name') and len(device.get('name', '')) > 2:
                filtered_devices.append(device)
        
        return filtered_devices

# Global instance
bluetooth_manager = BluetoothManager()
