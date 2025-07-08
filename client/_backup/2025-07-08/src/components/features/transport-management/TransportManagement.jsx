import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Button } from '../../ui';

/**
 * TransportManagement Component
 * 
 * Manages transport assignment, tracking, and logistics operations.
 * Handles vehicle assignment, route planning, and delivery tracking.
 * 
 * @component
 * @param {Object} props - Component props
 * @param {string} [props.className=''] - Additional CSS classes
 * @returns {React.ReactElement} The transport management component
 */
const TransportManagement = ({ className = '' }) => {
  const [transports, setTransports] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [selectedTransport, setSelectedTransport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showAssignForm, setShowAssignForm] = useState(false);

  // Mock data for transports and vehicles
  useEffect(() => {
    const mockTransports = [
      {
        id: 'TRP-001',
        packageIds: ['PKG-001', 'PKG-002'],
        vehicleId: 'VEH-001',
        driverName: 'Robert Smith',
        status: 'assigned',
        pickupLocation: 'Warehouse A',
        deliveryLocation: 'Downtown Office',
        estimatedDelivery: new Date('2024-01-18'),
        actualDelivery: null,
        distance: '15.2 km',
        route: 'Route A -> Route B -> Downtown',
        createdDate: new Date('2024-01-16')
      },
      {
        id: 'TRP-002',
        packageIds: ['PKG-003'],
        vehicleId: 'VEH-002',
        driverName: 'Sarah Johnson',
        status: 'in-transit',
        pickupLocation: 'Warehouse B',
        deliveryLocation: 'North Campus',
        estimatedDelivery: new Date('2024-01-17'),
        actualDelivery: null,
        distance: '22.8 km',
        route: 'Route C -> Route D -> North Campus',
        createdDate: new Date('2024-01-15')
      },
      {
        id: 'TRP-003',
        packageIds: ['PKG-004', 'PKG-005'],
        vehicleId: 'VEH-003',
        driverName: 'Mike Davis',
        status: 'delivered',
        pickupLocation: 'Warehouse A',
        deliveryLocation: 'South Mall',
        estimatedDelivery: new Date('2024-01-16'),
        actualDelivery: new Date('2024-01-16'),
        distance: '18.5 km',
        route: 'Route E -> Route F -> South Mall',
        createdDate: new Date('2024-01-14')
      }
    ];

    const mockVehicles = [
      {
        id: 'VEH-001',
        type: 'Van',
        plateNumber: 'ABC-1234',
        capacity: '1000 kg',
        status: 'available',
        currentLocation: 'Warehouse A'
      },
      {
        id: 'VEH-002',
        type: 'Truck',
        plateNumber: 'DEF-5678',
        capacity: '2000 kg',
        status: 'in-use',
        currentLocation: 'En Route'
      },
      {
        id: 'VEH-003',
        type: 'Van',
        plateNumber: 'GHI-9012',
        capacity: '1000 kg',
        status: 'available',
        currentLocation: 'Warehouse B'
      }
    ];

    setTransports(mockTransports);
    setVehicles(mockVehicles);
  }, []);

  /**
   * Handles status update for a transport
   * @param {string} transportId - The transport ID
   * @param {string} newStatus - The new status
   */
  const handleStatusUpdate = (transportId, newStatus) => {
    setTransports(prev => 
      prev.map(transport => 
        transport.id === transportId ? { ...transport, status: newStatus } : transport
      )
    );
  };

  /**
   * Handles transport selection for detailed view
   * @param {Object} transportData - The transport data
   */
  const handleTransportSelect = (transportData) => {
    setSelectedTransport(transportData);
  };

  /**
   * Gets status badge color based on transport status
   * @param {string} status - The transport status
   * @returns {string} The CSS classes for the status badge
   */
  const getStatusColor = (status) => {
    switch (status) {
      case 'assigned':
        return 'bg-yellow-100 text-yellow-800';
      case 'in-transit':
        return 'bg-blue-100 text-blue-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'delayed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  /**
   * Gets vehicle status badge color
   * @param {string} status - The vehicle status
   * @returns {string} The CSS classes for the status badge
   */
  const getVehicleStatusColor = (status) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'in-use':
        return 'bg-blue-100 text-blue-800';
      case 'maintenance':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  /**
   * Renders the transport assignment form
   */
  const renderAssignForm = () => (
    <div className="bg-white p-6 rounded-lg shadow mb-6">
      <h3 className="text-lg font-semibold mb-4">Assign Transport</h3>
      <form className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Package IDs
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter package IDs (comma-separated)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vehicle
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select vehicle</option>
              {vehicles.filter(v => v.status === 'available').map(vehicle => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.type} - {vehicle.plateNumber} ({vehicle.capacity})
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Driver Name
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter driver name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estimated Delivery
            </label>
            <input
              type="datetime-local"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pickup Location
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter pickup location"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Delivery Location
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter delivery location"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Route
          </label>
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="Enter route details"
          />
        </div>
        <div className="flex justify-end space-x-3">
          <Button
            variant="secondary"
            onClick={() => setShowAssignForm(false)}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setShowAssignForm(false);
              // Handle form submission here
            }}
          >
            Assign Transport
          </Button>
        </div>
      </form>
    </div>
  );

  /**
   * Renders the transport details view
   */
  const renderTransportDetails = () => {
    if (!selectedTransport) return null;

    return (
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold">Transport Details</h3>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSelectedTransport(null)}
          >
            Close
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-700 mb-3">Transport Information</h4>
            <div className="space-y-2">
              <p><span className="font-medium">Transport ID:</span> {selectedTransport.id}</p>
              <p><span className="font-medium">Package IDs:</span> {selectedTransport.packageIds.join(', ')}</p>
              <p><span className="font-medium">Vehicle ID:</span> {selectedTransport.vehicleId}</p>
              <p><span className="font-medium">Driver:</span> {selectedTransport.driverName}</p>
              <p><span className="font-medium">Status:</span> 
                <span className={`ml-2 px-2 py-1 rounded-full text-xs ${getStatusColor(selectedTransport.status)}`}>
                  {selectedTransport.status}
                </span>
              </p>
              <p><span className="font-medium">Distance:</span> {selectedTransport.distance}</p>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-700 mb-3">Delivery Information</h4>
            <div className="space-y-2">
              <p><span className="font-medium">Pickup Location:</span> {selectedTransport.pickupLocation}</p>
              <p><span className="font-medium">Delivery Location:</span> {selectedTransport.deliveryLocation}</p>
              <p><span className="font-medium">Estimated Delivery:</span> {selectedTransport.estimatedDelivery.toLocaleDateString()}</p>
              {selectedTransport.actualDelivery && (
                <p><span className="font-medium">Actual Delivery:</span> {selectedTransport.actualDelivery.toLocaleDateString()}</p>
              )}
              <p><span className="font-medium">Route:</span> {selectedTransport.route}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex space-x-3">
          {selectedTransport.status === 'assigned' && (
            <Button
              variant="primary"
              onClick={() => handleStatusUpdate(selectedTransport.id, 'in-transit')}
            >
              Start Transit
            </Button>
          )}
          {selectedTransport.status === 'in-transit' && (
            <Button
              variant="primary"
              onClick={() => handleStatusUpdate(selectedTransport.id, 'delivered')}
            >
              Mark as Delivered
            </Button>
          )}
          <Button variant="secondary">
            Track Route
          </Button>
          <Button variant="secondary">
            Contact Driver
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className={`p-6 ${className}`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Transport Management</h2>
        <Button
          variant="primary"
          onClick={() => setShowAssignForm(!showAssignForm)}
        >
          {showAssignForm ? 'Cancel' : 'Assign Transport'}
        </Button>
      </div>

      {showAssignForm && renderAssignForm()}
      {renderTransportDetails()}

      {/* Transport Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Transports</h3>
          <p className="text-2xl font-bold text-gray-900">{transports.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Assigned</h3>
          <p className="text-2xl font-bold text-yellow-600">
            {transports.filter(t => t.status === 'assigned').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">In Transit</h3>
          <p className="text-2xl font-bold text-blue-600">
            {transports.filter(t => t.status === 'in-transit').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Delivered</h3>
          <p className="text-2xl font-bold text-green-600">
            {transports.filter(t => t.status === 'delivered').length}
          </p>
        </div>
      </div>

      {/* Transport List */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Active Transports</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transport ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Packages
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Driver
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Est. Delivery
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transports.map((transport) => (
                <tr key={transport.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {transport.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {transport.packageIds.join(', ')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {transport.driverName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(transport.status)}`}>
                      {transport.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {transport.estimatedDelivery.toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleTransportSelect(transport)}
                    >
                      View Details
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vehicle List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Fleet Vehicles</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vehicle ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plate Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Capacity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {vehicles.map((vehicle) => (
                <tr key={vehicle.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {vehicle.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {vehicle.type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {vehicle.plateNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {vehicle.capacity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs ${getVehicleStatusColor(vehicle.status)}`}>
                      {vehicle.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {vehicle.currentLocation}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg">
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      )}
    </div>
  );
};

TransportManagement.propTypes = {
  className: PropTypes.string,
};

export default TransportManagement;
