import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Button } from '../../ui';

/**
 * PackageManagement Component
 * 
 * Manages the creation, tracking, and management of packages.
 * Handles package assembly from orders and preparation for transport.
 * 
 * @component
 * @param {Object} props - Component props
 * @param {string} [props.className=''] - Additional CSS classes
 * @returns {React.ReactElement} The package management component
 */
const PackageManagement = ({ className = '' }) => {
  const [packages, setPackages] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Mock data for packages
  useEffect(() => {
    const mockPackages = [
      {
        id: 'PKG-001',
        orderId: 'ORD-001',
        status: 'pending',
        items: [
          { productId: 'PROD-001', productName: 'Laptop Pro', quantity: 2 },
          { productId: 'PROD-002', productName: 'Wireless Mouse', quantity: 2 }
        ],
        weight: '5.2 kg',
        dimensions: '40x30x15 cm',
        createdDate: new Date('2024-01-15'),
        preparationDeadline: new Date('2024-01-17'),
        assignedStaff: 'John Doe'
      },
      {
        id: 'PKG-002',
        orderId: 'ORD-002',
        status: 'ready',
        items: [
          { productId: 'PROD-003', productName: 'Office Chair', quantity: 1 }
        ],
        weight: '12.5 kg',
        dimensions: '65x65x110 cm',
        createdDate: new Date('2024-01-14'),
        preparationDeadline: new Date('2024-01-16'),
        assignedStaff: 'Jane Smith'
      },
      {
        id: 'PKG-003',
        orderId: 'ORD-003',
        status: 'in-transit',
        items: [
          { productId: 'PROD-004', productName: 'Smartphone', quantity: 3 }
        ],
        weight: '1.8 kg',
        dimensions: '25x15x10 cm',
        createdDate: new Date('2024-01-13'),
        preparationDeadline: new Date('2024-01-15'),
        assignedStaff: 'Mike Johnson'
      }
    ];
    setPackages(mockPackages);
  }, []);

  /**
   * Handles status update for a package
   * @param {string} packageId - The package ID
   * @param {string} newStatus - The new status
   */
  const handleStatusUpdate = (packageId, newStatus) => {
    setPackages(prev => 
      prev.map(pkg => 
        pkg.id === packageId ? { ...pkg, status: newStatus } : pkg
      )
    );
  };

  /**
   * Handles package selection for detailed view
   * @param {Object} packageData - The package data
   */
  const handlePackageSelect = (packageData) => {
    setSelectedPackage(packageData);
  };

  /**
   * Gets status badge color based on package status
   * @param {string} status - The package status
   * @returns {string} The CSS classes for the status badge
   */
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'ready':
        return 'bg-green-100 text-green-800';
      case 'in-transit':
        return 'bg-blue-100 text-blue-800';
      case 'delivered':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  /**
   * Renders the package creation form
   */
  const renderCreateForm = () => (
    <div className="bg-white p-6 rounded-lg shadow mb-6">
      <h3 className="text-lg font-semibold mb-4">Create New Package</h3>
      <form className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Order ID
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter order ID"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assigned Staff
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select staff member</option>
              <option value="john">John Doe</option>
              <option value="jane">Jane Smith</option>
              <option value="mike">Mike Johnson</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Weight (kg)
            </label>
            <input
              type="number"
              step="0.1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Length (cm)
            </label>
            <input
              type="number"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Width (cm)
            </label>
            <input
              type="number"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0"
            />
          </div>
        </div>
        <div className="flex justify-end space-x-3">
          <Button
            variant="secondary"
            onClick={() => setShowCreateForm(false)}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setShowCreateForm(false);
              // Handle form submission here
            }}
          >
            Create Package
          </Button>
        </div>
      </form>
    </div>
  );

  /**
   * Renders the package details view
   */
  const renderPackageDetails = () => {
    if (!selectedPackage) return null;

    return (
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold">Package Details</h3>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSelectedPackage(null)}
          >
            Close
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-700 mb-3">Package Information</h4>
            <div className="space-y-2">
              <p><span className="font-medium">Package ID:</span> {selectedPackage.id}</p>
              <p><span className="font-medium">Order ID:</span> {selectedPackage.orderId}</p>
              <p><span className="font-medium">Status:</span> 
                <span className={`ml-2 px-2 py-1 rounded-full text-xs ${getStatusColor(selectedPackage.status)}`}>
                  {selectedPackage.status}
                </span>
              </p>
              <p><span className="font-medium">Weight:</span> {selectedPackage.weight}</p>
              <p><span className="font-medium">Dimensions:</span> {selectedPackage.dimensions}</p>
              <p><span className="font-medium">Assigned Staff:</span> {selectedPackage.assignedStaff}</p>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-700 mb-3">Package Items</h4>
            <div className="space-y-2">
              {selectedPackage.items.map((item, index) => (
                <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span>{item.productName}</span>
                  <span className="text-sm text-gray-600">Qty: {item.quantity}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex space-x-3">
          {selectedPackage.status === 'pending' && (
            <Button
              variant="primary"
              onClick={() => handleStatusUpdate(selectedPackage.id, 'ready')}
            >
              Mark as Ready
            </Button>
          )}
          {selectedPackage.status === 'ready' && (
            <Button
              variant="primary"
              onClick={() => handleStatusUpdate(selectedPackage.id, 'in-transit')}
            >
              Mark as In Transit
            </Button>
          )}
          <Button variant="secondary">
            Print Label
          </Button>
          <Button variant="secondary">
            Edit Package
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className={`p-6 ${className}`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Package Management</h2>
        <Button
          variant="primary"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? 'Cancel' : 'Create Package'}
        </Button>
      </div>

      {showCreateForm && renderCreateForm()}
      {renderPackageDetails()}

      {/* Package Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Packages</h3>
          <p className="text-2xl font-bold text-gray-900">{packages.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Pending</h3>
          <p className="text-2xl font-bold text-yellow-600">
            {packages.filter(pkg => pkg.status === 'pending').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Ready</h3>
          <p className="text-2xl font-bold text-green-600">
            {packages.filter(pkg => pkg.status === 'ready').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">In Transit</h3>
          <p className="text-2xl font-bold text-blue-600">
            {packages.filter(pkg => pkg.status === 'in-transit').length}
          </p>
        </div>
      </div>

      {/* Package List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Package List</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Package ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Weight
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned Staff
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {packages.map((packageData) => (
                <tr key={packageData.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {packageData.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {packageData.orderId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(packageData.status)}`}>
                      {packageData.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {packageData.weight}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {packageData.assignedStaff}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handlePackageSelect(packageData)}
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

PackageManagement.propTypes = {
  className: PropTypes.string,
};

export default PackageManagement;
