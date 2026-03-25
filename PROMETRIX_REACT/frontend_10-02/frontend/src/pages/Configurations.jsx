import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Wifi, 
  WifiOff, 
  Check,
  X,
  Smartphone,
  Bluetooth,
  Trash2,
  Settings
} from 'lucide-react';
import axios from 'axios';

const API_BASE = 'http://localhost:8000/api/v1/bluetooth';

const Configurations = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState([]);
  const [systemDevices, setSystemDevices] = useState([]);
  const [connectedDevices, setConnectedDevices] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [adapterInfo, setAdapterInfo] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch connected devices immediately on mount and poll every 5 seconds
  useEffect(() => {
    fetchConnectedDevices(true); // Initial fetch with loading
    fetchAdapterInfo();
    
    // Poll for connected devices every 5 seconds to show them faster
    const interval = setInterval(() => {
      fetchConnectedDevices(false); // Polling without loading spinner
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchConnectedDevices = async (isInitial = false) => {
    try {
      if (isInitial) setLoadingDevices(true);
      const response = await axios.get(`${API_BASE}/connected`);
      setConnectedDevices(response.data.devices || []);
    } catch (err) {
      console.error('Failed to fetch connected devices:', err);
    } finally {
      if (isInitial) setLoadingDevices(false);
    }
  };

  const fetchAdapterInfo = async () => {
    try {
      const response = await axios.get(`${API_BASE}/adapter`);
      setAdapterInfo(response.data.info || null);
    } catch (err) {
      console.error('Failed to fetch adapter info:', err);
      setAdapterInfo(null);
    }
  };

  const scanDevices = async () => {
    setIsScanning(true);
    setError('');
    setSuccess('');
    try {
      // Increased timeout to 15 seconds for better detection
      const response = await axios.get(`${API_BASE}/scan?timeout=15.0`);
      setDiscoveredDevices(response.data.devices || []);
      const count = response.data.devices?.length ?? 0;
      setSuccess(count > 0 ? `Found ${count} nearby BLE device${count !== 1 ? 's' : ''}` : 'Scan complete - no BLE devices found nearby');
    } catch (err) {
      setError('Failed to scan: ' + (err.response?.data?.detail || err.message));
    } finally {
      setIsScanning(false);
    }
  };

  const stopScan = async () => {
    try {
      await axios.post(`${API_BASE}/scan/stop`);
      setIsScanning(false);
      setSuccess('Scan stopped');
    } catch (err) {
      console.error('Failed to stop scan:', err);
    }
  };

  const connectDevice = async (device) => {
    setError('');
    setSuccess('');
    try {
      const response = await axios.post(`${API_BASE}/connect/${device.address}`);
      if (response.data.success) {
        setSuccess(`Connected to ${device.name}`);
        setDiscoveredDevices(prev => prev.filter(d => d.address !== device.address));
        await fetchConnectedDevices();
      }
    } catch (err) {
      setError('Failed to connect: ' + (err.response?.data?.detail || err.message));
    }
  };

  const disconnectDevice = async (device) => {
    setError('');
    setSuccess('');
    try {
      const response = await axios.post(`${API_BASE}/disconnect/${device.address}`);
      if (response.data.success) {
        setSuccess(`Disconnected from ${device.name}`);
        await fetchConnectedDevices();
      }
    } catch (err) {
      setError('Failed to disconnect: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleAddDevice = () => {
    setShowAddDevice(true);
    setDiscoveredDevices([]);
    setSystemDevices([]);
    setError('');
    setSuccess('');
    fetchAdapterInfo();
    fetchSystemDevices();
  };

  const fetchSystemDevices = async () => {
    try {
      const response = await axios.get(`${API_BASE}/system-devices`);
      setSystemDevices(response.data.devices || []);
    } catch (err) {
      console.error('Failed to fetch system devices:', err);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px' }}>
      {/* Header Section */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Settings size={24} color="#374151" />
          <h1 style={{ 
            fontSize: '24px', 
            fontWeight: '600', 
            color: '#111827',
            margin: 0 
          }}>
            Manage Bluetooth Devices
          </h1>
        </div>
        <button
          onClick={handleAddDevice}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            backgroundColor: '#2563eb',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}
        >
          <Plus size={18} />
          Add New Device
        </button>
      </div>

      {/* Status Messages */}
      {error && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '6px',
          color: '#dc2626',
          fontSize: '14px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <X size={16} />
          {error}
        </div>
      )}

      {success && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '6px',
          color: '#16a34a',
          fontSize: '14px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Check size={16} />
          {success}
        </div>
      )}

      {/* Connected Devices Table */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '16px 20px',
          backgroundColor: '#f9fafb',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ 
            fontSize: '16px', 
            fontWeight: '600', 
            color: '#374151',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Bluetooth size={18} color="#2563eb" />
            Connected Devices
          </h2>
          <span style={{
            padding: '4px 12px',
            backgroundColor: '#dbeafe',
            color: '#2563eb',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: '500'
          }}>
            {connectedDevices.length} device{connectedDevices.length !== 1 ? 's' : ''}
          </span>
        </div>

        {loadingDevices ? (
          <div style={{
            padding: '48px 24px',
            textAlign: 'center',
            color: '#6b7280'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid #e5e7eb',
              borderTop: '3px solid #2563eb',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px'
            }} />
            <p style={{ fontSize: '14px', margin: 0 }}>Loading connected devices...</p>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          </div>
        ) : connectedDevices.length === 0 ? (
          <div style={{
            padding: '48px 24px',
            textAlign: 'center',
            color: '#9ca3af'
          }}>
            <WifiOff size={48} style={{ marginBottom: '12px', opacity: 0.5 }} />
            <p style={{ fontSize: '16px', margin: '0 0 4px', fontWeight: '500', color: '#6b7280' }}>
              No devices connected
            </p>
            <p style={{ fontSize: '14px', margin: 0 }}>
              Click "Add New Device" to scan and connect to Bluetooth devices
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Device</th>
                <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Address</th>
                <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                <th style={{ padding: '12px 20px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {connectedDevices.map((device) => (
                <tr key={device.address} style={{ borderTop: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        backgroundColor: '#dbeafe',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Smartphone size={20} color="#2563eb" />
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: '500', color: '#111827' }}>{device.name}</p>
                        <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>BLE Device</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px', fontSize: '14px', color: '#6b7280', fontFamily: 'monospace' }}>
                    {device.address}
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 12px',
                      backgroundColor: '#dcfce7',
                      color: '#16a34a',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}>
                      <Wifi size={12} />
                      Connected
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                    <button
                      onClick={() => disconnectDevice(device)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 16px',
                        backgroundColor: '#fee2e2',
                        color: '#dc2626',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: '500',
                        cursor: 'pointer'
                      }}
                    >
                      <WifiOff size={14} />
                      Disconnect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Device Modal */}
      {showAddDevice && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '24px',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
              paddingBottom: '16px',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bluetooth size={20} color="#2563eb" />
                Add Bluetooth Device
              </h3>
              <button
                onClick={() => setShowAddDevice(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '4px' }}
              >
                <X size={24} />
              </button>
            </div>

            {/* Adapter Status */}
            {adapterInfo && (
              <div style={{
                fontSize: '12px',
                backgroundColor: adapterInfo.winrt_available === false ? '#fef2f2' : '#f0fdf4',
                border: `1px solid ${adapterInfo.winrt_available === false ? '#fecaca' : '#bbf7d0'}`,
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '16px'
              }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  gap: '8px',
                  color: adapterInfo.winrt_available === false ? '#dc2626' : '#16a34a',
                  fontWeight: 600,
                  marginBottom: '4px'
                }}>
                  <span>Bluetooth API: {adapterInfo.winrt_available === false ? '❌ Not Available' : '✓ Available'}</span>
                  <span>{adapterInfo.platform}</span>
                </div>
                <div style={{ display: 'flex', gap: '16px', color: '#6b7280', fontSize: '11px' }}>
                  <span>Bleak: {adapterInfo.bleak_scanner_available === false ? '❌' : '✓'}</span>
                  <span>Adapter: {adapterInfo.bluetooth_adapter_accessible === false ? '❌' : '✓'}</span>
                </div>
              </div>
            )}

            {/* Scan Button */}
            <button
              onClick={isScanning ? stopScan : scanDevices}
              disabled={isScanning && false}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 20px',
                backgroundColor: isScanning ? '#dc2626' : '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                marginBottom: '16px'
              }}
            >
              {isScanning ? (
                <><X size={18} /><span>Stop Scan</span></>
              ) : (
                <><Search size={18} /><span>Scan for Devices</span></>
              )}
            </button>

            {/* Info Box */}
            <div style={{
              marginBottom: '16px',
              padding: '12px',
              backgroundColor: '#eff6ff',
              border: '1px solid #dbeafe',
              borderRadius: '8px'
            }}>
              <p style={{ fontSize: '12px', color: '#1f2937', margin: 0, lineHeight: '1.5' }}>
                <b>Note:</b> This scanner finds BLE (Bluetooth Low Energy) devices that are advertising. 
                Make sure your device is in pairing mode and nearby.
              </p>
            </div>

            {/* Windows Connected Devices */}
            {systemDevices.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ 
                  fontSize: '14px', 
                  fontWeight: '600', 
                  color: '#374151', 
                  margin: '0 0 12px 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <Wifi size={16} color="#16a34a" />
                  Windows Connected Devices ({systemDevices.length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {systemDevices.map((device, index) => (
                    <div
                      key={device.id || index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        backgroundColor: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderRadius: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          backgroundColor: '#dcfce7',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Smartphone size={18} color="#16a34a" />
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: '14px', fontWeight: '500', color: '#111827' }}>{device.name}</p>
                          <p style={{ margin: 0, fontSize: '11px', color: '#6b7280' }}>Connected via Windows</p>
                        </div>
                      </div>
                      <button
                        onClick={() => device.address ? connectDevice({ address: device.address, name: device.name }) : setError('Cannot connect: Device address not available')}
                        disabled={!device.address}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '6px 12px',
                          backgroundColor: device.address ? '#16a34a' : '#9ca3af',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '500',
                          cursor: device.address ? 'pointer' : 'not-allowed',
                          opacity: device.address ? 1 : 0.6
                        }}
                      >
                        <Plus size={14} />
                        {device.address ? 'Connect' : 'No Address'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Discovered Devices */}
            {discoveredDevices.length > 0 && (
              <div>
                <h4 style={{ 
                  fontSize: '14px', 
                  fontWeight: '600', 
                  color: '#374151', 
                  margin: '0 0 12px 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <Search size={16} />
                  Nearby Devices ({discoveredDevices.length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {discoveredDevices.map((device) => (
                    <div
                      key={device.address}
                      onClick={() => connectDevice(device)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        backgroundColor: '#f9fafb',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          backgroundColor: '#dbeafe',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Bluetooth size={18} color="#2563eb" />
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: '14px', fontWeight: '500', color: '#111827' }}>{device.name}</p>
                          <p style={{ margin: 0, fontSize: '12px', color: '#6b7280', fontFamily: 'monospace' }}>{device.address}</p>
                        </div>
                      </div>
                      <button
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '6px 12px',
                          backgroundColor: '#2563eb',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '500',
                          cursor: 'pointer'
                        }}
                      >
                        <Plus size={14} />
                        Connect
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {discoveredDevices.length === 0 && !isScanning && (
              <div style={{
                padding: '32px',
                textAlign: 'center',
                color: '#9ca3af'
              }}>
                <Search size={48} style={{ marginBottom: '12px', opacity: 0.5 }} />
                <p style={{ fontSize: '14px', margin: '0 0 4px', fontWeight: '500', color: '#6b7280' }}>
                  No devices found yet
                </p>
                <p style={{ fontSize: '12px', margin: 0 }}>
                  Click "Scan for Devices" to search for nearby Bluetooth devices
                </p>
              </div>
            )}

            {/* Scanning Indicator */}
            {isScanning && discoveredDevices.length === 0 && (
              <div style={{
                padding: '32px',
                textAlign: 'center',
                color: '#6b7280'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  border: '3px solid #e5e7eb',
                  borderTop: '3px solid #2563eb',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 12px'
                }} />
                <p style={{ fontSize: '14px', margin: 0 }}>Scanning for devices...</p>
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Configurations;
