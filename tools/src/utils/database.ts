import { MongoClient } from 'mongodb';

const uri = process.env.MONGO_URI || 'mongodb://localhost:27017';
const client = new MongoClient(uri);
const dbName = 'tools-management';

export const saveToDatabase = async (ticketData: any) => {
  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection('tickets');

    // Upsert ticket data based on ticket ID
    await collection.updateOne(
      { id: ticketData.id },
      { $set: ticketData },
      { upsert: true }
    );
  } catch (error) {
    console.error('Error saving to database:', error);
    throw error;
  } finally {
    await client.close();
  }
};