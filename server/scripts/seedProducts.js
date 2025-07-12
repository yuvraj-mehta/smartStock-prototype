import mongoose from 'mongoose';
import { Product, Inventory, Batch } from '../models/index.js';
import { conf } from '../config/config.js';

// Sample product data for testing
const sampleProducts = [
  {
    productName: 'iPhone 15 Pro',
    sku: 'IPH15P-001',
    productCategory: 'Electronics',
    price: 999.99,
    description: 'Latest iPhone with Pro features',
    measurementUnit: 'pieces'
  },
  {
    productName: 'Samsung Galaxy S24',
    sku: 'SGS24-001', 
    productCategory: 'Electronics',
    price: 899.99,
    description: 'Premium Android smartphone',
    measurementUnit: 'pieces'
  },
  {
    productName: 'MacBook Pro 14"',
    sku: 'MBP14-001',
    productCategory: 'Electronics', 
    price: 1999.99,
    description: 'Professional laptop for power users',
    measurementUnit: 'pieces'
  },
  {
    productName: 'Nike Air Jordan 1',
    sku: 'NAJ1-001',
    productCategory: 'Footwear',
    price: 170.00,
    description: 'Classic basketball sneakers',
    measurementUnit: 'pairs'
  },
  {
    productName: 'Coca Cola 12oz',
    sku: 'CC12-001',
    productCategory: 'Beverages',
    price: 1.99,
    description: 'Classic cola beverage',
    measurementUnit: 'pieces'
  }
];

async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(conf.mongoUri, {
      dbName: conf.dbName
    });
    console.log('Connected to MongoDB');

    // Clear existing test data
    console.log('Clearing existing test data...');
    await Product.deleteMany({ sku: { $in: sampleProducts.map(p => p.sku) } });

    // Create products
    console.log('Creating sample products...');
    const createdProducts = await Product.insertMany(sampleProducts);
    console.log(`Created ${createdProducts.length} products`);

    // Create batches and inventory for each product
    console.log('Creating inventory data...');
    for (const product of createdProducts) {
      // Create a batch
      const batch = new Batch({
        batchNumber: `BATCH-${product.sku}-${Date.now()}`,
        productId: product._id,
        quantity: Math.floor(Math.random() * 200) + 50, // 50-250 units
        mfgDate: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000), // Random date within last 90 days
        expDate: new Date(Date.now() + Math.random() * 365 * 24 * 60 * 60 * 1000) // Random future date within next year
      });
      
      await batch.save();

      // Create inventory entry
      const inventory = new Inventory({
        productId: product._id,
        batchId: batch._id,
        warehouseId: new mongoose.Types.ObjectId(), // Random warehouse ID
        quantity: batch.quantity,
        location: `Shelf-${Math.floor(Math.random() * 100) + 1}`
      });

      await inventory.save();
    }

    console.log('Sample data created successfully!');
    console.log('You can now test the AI features with real product data.');
    
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the seed function
seedDatabase();
