const { EventEmitter } = require('events');

const csv =
    '大一,,,大二,,\r\n學號,姓名,系學會費,學號,姓名,系學會費\r\nb15705001,"測試,同學",O,B14705001,測試,o\r\nB15705002,測試,,B14705002,測試,X';
let service;
let get;

beforeEach(() => {
    jest.resetModules();
    delete process.env.FEE_SHEET_SPREADSHEET_ID;
    delete process.env.FEE_SHEET_GID;
    get = jest.fn((url, callback) => {
        const request = new EventEmitter();
        request.setTimeout = jest.fn();
        process.nextTick(() => {
            const response = new EventEmitter();
            response.statusCode = 200;
            response.setEncoding = jest.fn();
            callback(response);
            response.emit('data', csv);
            response.emit('end');
        });
        return request;
    });
    jest.doMock('https', () => ({ get }));
    service = require('../services/feeStatusService');
});

test('reads O markers across year groups, ignoring blank and X markers', () => {
    expect([...service.buildPaidStudentSet(service.parseCsv(csv))]).toEqual([
        'B15705001',
        'B14705001',
    ]);
});

test('uses the new sheet and caches lookups, including normalized IDs and unknown students', async () => {
    expect(await service.checkStudentPaidFee(' b15705001 ')).toBe(true);
    expect(await service.checkStudentPaidFee('B15705002')).toBe(false);
    expect(await service.checkStudentPaidFee('UNKNOWN')).toBe(false);
    expect(get).toHaveBeenCalledTimes(1);
    expect(get.mock.calls[0][0]).toBe(
        'https://docs.google.com/spreadsheets/d/1xHGJUZsynRpxp6gGAKCZhwXGMkubDSDx5zxvpNJdYP8/export?format=csv&gid=0',
    );
});

test('syncs existing paid and unpaid accounts from the new source', async () => {
    const paid = { studentId: 'b15705001', hasPaidFee: false, update: jest.fn() };
    const unpaid = { studentId: 'B15705002', hasPaidFee: true, update: jest.fn() };
    await service.syncStudentFeeStatus(paid);
    await service.syncStudentFeeStatus(unpaid);
    expect(paid.update).toHaveBeenCalledWith({ hasPaidFee: true });
    expect(unpaid.update).toHaveBeenCalledWith({ hasPaidFee: false });
});

test('does not write unchanged fee status', async () => {
    const user = { studentId: 'B15705001', hasPaidFee: true, update: jest.fn() };
    await service.syncStudentFeeStatus(user);
    expect(user.update).not.toHaveBeenCalled();
});

test('does not overwrite stored fee status when fetching fails, and denies member access for the request', async () => {
    get.mockImplementation(() => {
        const request = new EventEmitter();
        request.setTimeout = jest.fn();
        process.nextTick(() => request.emit('error', new Error('unavailable')));
        return request;
    });
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    const user = { studentId: 'B15705001', hasPaidFee: true, update: jest.fn() };
    await service.syncStudentFeeStatus(user);
    expect(user.update).not.toHaveBeenCalled();
    expect(user.hasPaidFee).toBe(false);
    log.mockRestore();
});

test('rejects incomplete, HTML and changed headers instead of revoking every account', () => {
    expect(() => service.buildPaidStudentSet(service.parseCsv('<html>Login</html>'))).toThrow();
    expect(() => service.buildPaidStudentSet([['title'], ['other'], ['value']])).toThrow();
    expect(() =>
        service.buildPaidStudentSet([['title'], ['學號', '姓名', 'other'], ['value']]),
    ).toThrow();
});
