const { checkStudentPaidFee } = require('./services/feeStatusService');

async function run() {
    const studentIds = process.argv.slice(2);

    if (studentIds.length === 0) {
        console.log('請提供至少一個學號，例如：node test-fee-status.js B13705008');
        process.exit(1);
    }

    for (const studentId of studentIds) {
        const hasPaidFee = await checkStudentPaidFee(studentId);
        console.log(`${studentId}: ${hasPaidFee ? '已繳費' : '未繳費或查無資料'}`);
    }
}

run();
