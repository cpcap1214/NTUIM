import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import SponsorCarousel from '../../../main/js/components/SponsorCarousel';
jest.mock('../../../main/js/services/api', () => ({ API_BASE_URL: '/api' }));
let intersection;
beforeEach(() => {
    jest.useFakeTimers();
    global.IntersectionObserver = class {
        constructor(callback) {
            intersection = callback;
        }
        observe() {}
        disconnect() {}
    };
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
    Object.defineProperty(global, 'crypto', {
        configurable: true,
        value: { randomUUID: () => '12345678-1234-4123-8123-123456789012' },
    });
});
afterEach(() => jest.useRealTimers());
const advance = (ms) => act(() => jest.advanceTimersByTime(ms));
it('automatically rotates every three seconds even while hovered, without controls', () => {
    render(<SponsorCarousel />);
    fireEvent.mouseEnter(screen.getByRole('region'));
    advance(2999);
    expect(screen.getByAltText('臺大資管系學會')).toBeTruthy();
    advance(1);
    expect(screen.getByAltText('悠遊付｜開學季最高回饋 30%')).toBeTruthy();
    expect(screen.queryByLabelText('下一張圖片')).toBeNull();
    expect(screen.queryByText('播放')).toBeNull();
    advance(9000);
    expect(screen.getByAltText('臺大資管系學會')).toBeTruthy();
});
it('requires a loaded image and a continuous visible second; deduplicates revisits', () => {
    render(<SponsorCarousel />);
    advance(3000);
    act(() => intersection([{ isIntersecting: true, intersectionRatio: 0.6 }]));
    advance(200);
    expect(fetch).not.toHaveBeenCalled();
    fireEvent.load(screen.getByAltText('悠遊付｜開學季最高回饋 30%'));
    advance(700);
    act(() => intersection([{ isIntersecting: false, intersectionRatio: 0 }]));
    advance(200);
    expect(fetch).not.toHaveBeenCalled();
    act(() => intersection([{ isIntersecting: true, intersectionRatio: 1 }]));
    advance(1000);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetch.mock.calls[0][1].body).type).toBe('impression');
    advance(9900);
    fireEvent.load(screen.getByAltText('悠遊付｜開學季最高回饋 30%'));
    advance(1000);
    expect(fetch).toHaveBeenCalledTimes(1);
});
it('pauses while the full image is open and resumes after closing', () => {
    render(<SponsorCarousel />);
    advance(3000);
    fireEvent.click(screen.getByLabelText('悠遊付｜開學季最高回饋 30%，點開完整圖片'));
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(JSON.parse(fetch.mock.calls[0][1].body).type).toBe('open');
    advance(6000);
    expect(screen.getByRole('dialog').textContent).toContain('開學季最高回饋');
    fireEvent.click(screen.getByRole('button', { name: '關閉' }));
    advance(3000);
    expect(screen.getByAltText('悠遊付｜雙週領券與使用步驟')).toBeTruthy();
});
