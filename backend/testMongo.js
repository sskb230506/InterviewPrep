import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';

dotenv.config();

async function test() {
    try {
        await mongoose.connect(process.env.DATABASE_URL);
        console.log('Connected');
        const user = await User.create({ email: 'test_script@test.com', passwordHash: 'hash', name: 'Test' });
        console.log('Created!', user);
        process.exit(0);
    } catch (err) {
        console.error('ERROR LOG:', err);
        process.exit(1);
    }
}
test();
