import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

async function check() {
    try {
        await mongoose.connect(process.env.DATABASE_URL);
        const sessions = await mongoose.connection.db.collection('sessions').find().toArray();
        const users = await mongoose.connection.db.collection('users').find().toArray();
        const evaluations = await mongoose.connection.db.collection('evaluations').find().toArray();
        const answers = await mongoose.connection.db.collection('answers').find().toArray();
        const questions = await mongoose.connection.db.collection('questions').find().toArray();

        const report = {
            users: users.map(u => ({ _id: u._id.toString(), email: u.email })),
            sessions: sessions.map(s => ({ _id: s._id.toString(), userId: s.userId?.toString() })),
            questions: questions.map(q => ({ _id: q._id.toString(), sessionId: q.sessionId?.toString() })),
            answers: answers.map(a => ({ _id: a._id.toString(), questionId: a.questionId?.toString() })),
            evaluations: evaluations.map(e => ({ answerId: e.answerId?.toString(), scoreTech: e.scoreTech, scoreRelevance: e.scoreRelevance, scoreDepth: e.scoreDepth })),
        };

        fs.writeFileSync('db_report.json', JSON.stringify(report, null, 2));
        console.log('Written to db_report.json');
        process.exit(0);
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
}
check();
