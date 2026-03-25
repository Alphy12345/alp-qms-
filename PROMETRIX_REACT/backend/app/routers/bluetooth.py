"""
Bluetooth router for managing Bluetooth device operations.
"""

from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
import asyncio
from app.models.bluetooth import bluetooth_manager

router = APIRouter(prefix="/bluetooth", tags=["bluetooth"])

@router.get("/scan")
async def scan_devices(timeout: float = 15.0) -> Dict[str, Any]:
    """
    Scan for nearby Bluetooth devices.
    
    Args:
        timeout: Scanning timeout in seconds (default: 15.0, max: 30.0)
        
    Returns:
        Dictionary with scan results
    """
    # Limit max timeout to prevent hanging
    timeout = min(timeout, 30.0)
    try:
        devices = await bluetooth_manager.scan_devices(timeout=timeout)
        return {
            "success": True,
            "message": f"Found {len(devices)} devices",
            "devices": devices
        }
    except asyncio.CancelledError:
        return {
            "success": False,
            "message": "Scan was cancelled",
            "devices": bluetooth_manager.get_discovered_devices()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scan failed: {str(e)}")

@router.post("/scan/stop")
async def stop_scan() -> Dict[str, Any]:
    """Stop/cancel any running scan."""
    try:
        bluetooth_manager._scanning = False
        return {
            "success": True,
            "message": "Scan stopped",
            "devices": bluetooth_manager.get_discovered_devices()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to stop scan: {str(e)}")

@router.post("/connect/{address}")
async def connect_device(address: str) -> Dict[str, Any]:
    """
    Connect to a Bluetooth device.
    
    Args:
        address: Device address to connect to
        
    Returns:
        Connection status and device info
    """
    try:
        result = await bluetooth_manager.connect_device(address)
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["message"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Connection failed: {str(e)}")

@router.post("/disconnect/{address}")
async def disconnect_device(address: str) -> Dict[str, Any]:
    """
    Disconnect from a Bluetooth device.
    
    Args:
        address: Device address to disconnect
        
    Returns:
        Disconnection status
    """
    try:
        result = await bluetooth_manager.disconnect_device(address)
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["message"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Disconnection failed: {str(e)}")

@router.get("/connected")
async def get_connected_devices() -> Dict[str, Any]:
    """
    Get list of currently connected devices.
    
    Returns:
        List of connected device information
    """
    try:
        devices = bluetooth_manager.get_connected_devices()
        return {
            "success": True,
            "devices": devices
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get connected devices: {str(e)}")

@router.get("/discovered")
async def get_discovered_devices() -> Dict[str, Any]:
    """
    Get list of discovered devices from last scan.
    
    Returns:
        List of discovered device information
    """
    try:
        devices = bluetooth_manager.get_discovered_devices()
        return {
            "success": True,
            "devices": devices
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get discovered devices: {str(e)}")

@router.get("/paired")
async def get_paired_devices() -> Dict[str, Any]:
    """List paired/known Bluetooth devices (Windows only)."""
    try:
        devices = await bluetooth_manager.get_paired_devices()
        return {
            "success": True,
            "devices": devices
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get paired devices: {str(e)}")

@router.get("/adapter")
async def get_adapter_info() -> Dict[str, Any]:
    """Get Bluetooth adapter diagnostics."""
    try:
        return {
            "success": True,
            "info": bluetooth_manager.get_bluetooth_adapter_info()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get adapter info: {str(e)}")

@router.get("/system-devices")
async def get_system_devices() -> Dict[str, Any]:
    """Get Bluetooth devices connected via Windows system settings."""
    try:
        devices = await bluetooth_manager.get_system_connected_devices()
        return {
            "success": True,
            "devices": devices
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get system devices: {str(e)}")
