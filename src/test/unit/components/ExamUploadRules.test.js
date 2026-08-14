// 驗證上傳規範用 <Trans> + 自訂行內標籤（<red>、<redBold>、<b>、<code>）真的會渲染成元素，
// 而不是把標籤原樣印在畫面上。
//
// 這件事值得測：規範有 30 條字串走這個機制，若 components 對應寫錯，
// 畫面會出現「一、可上傳<red>五年內</red>之」這種原始標籤——不會拋錯，
// 只會安靜地醜掉，而且 30 條全中。

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { I18nextProvider } from 'react-i18next';
import i18next from 'i18next';
import { initReactI18next, Trans } from 'react-i18next';
import { Box } from '@mui/material';
import zhTW from '../../../main/js/i18n/locales/zh-TW';
import en from '../../../main/js/i18n/locales/en';

const makeI18n = (lng) => {
    const instance = i18next.createInstance();
    instance.use(initReactI18next).init({
        lng,
        resources: { 'zh-TW': { translation: zhTW }, en: { translation: en } },
        interpolation: { escapeValue: false },
    });
    return instance;
};

const inlineMarks = {
    red: <Box component="span" data-testid="red" />,
    redBold: <Box component="span" data-testid="redBold" />,
    b: <strong data-testid="bold" />,
};

const renderKey = (lng, key, values) =>
    render(
        <I18nextProvider i18n={makeI18n(lng)}>
            <Trans i18nKey={key} components={inlineMarks} values={values} />
        </I18nextProvider>
    );

describe('上傳規範的 <Trans> 行內標記', () => {
    test.each([['zh-TW'], ['en']])('%s：<red> 會變成元素而不是文字', (lng) => {
        const { container } = renderKey(lng, 'examUpload.rules.s1.title');
        expect(screen.getByTestId('red')).toBeInTheDocument();
        // 最容易發生的失敗樣態：標籤被當成純文字印出來
        expect(container.textContent).not.toContain('<red>');
    });

    test.each([['zh-TW'], ['en']])('%s：<redBold> 與 <b> 同時出現時都正確', (lng) => {
        const { container } = renderKey(lng, 'examUpload.rules.s1.exams');
        expect(screen.getByTestId('redBold')).toBeInTheDocument();
        expect(screen.getByTestId('bold')).toBeInTheDocument();
        expect(container.textContent).not.toContain('<b>');
        expect(container.textContent).not.toContain('<redBold>');
    });

    test.each([['zh-TW'], ['en']])('%s：s4.body 的兩個 redBold 都渲染', (lng) => {
        const { container } = renderKey(lng, 'examUpload.rules.s4.body');
        expect(screen.getAllByTestId('redBold')).toHaveLength(2);
        expect(container.textContent).not.toContain('<redBold>');
    });

    test.each([['zh-TW'], ['en']])('%s：帶 {{pattern}} 插值的 step2Body 會代入而不是留下佔位符', (lng) => {
        const i18n = makeI18n(lng);
        const pattern = i18n.t('examUpload.namingPattern');
        const { container } = render(
            <I18nextProvider i18n={i18n}>
                <Trans
                    i18nKey="examUpload.rules.s6.step2Body"
                    components={{ ...inlineMarks, code: <code data-testid="code" /> }}
                    values={{ pattern }}
                />
            </I18nextProvider>
        );
        expect(screen.getByTestId('code')).toHaveTextContent(pattern);
        expect(container.textContent).not.toContain('{{pattern}}');
        expect(container.textContent).not.toContain('<code>');
    });

    test('zh-TW 與 en 的規範條文都不是空的', () => {
        const keys = [
            'examUpload.rules.s1.title',
            'examUpload.rules.s2.example1',
            'examUpload.rules.s3.reward',
            'examUpload.rules.s5.examFormat',
            'examUpload.rules.s6.step3Body',
        ];
        ['zh-TW', 'en'].forEach((lng) => {
            const i18n = makeI18n(lng);
            keys.forEach((k) => {
                const v = i18n.t(k);
                expect(v).not.toBe(k); // 查不到 key 時 i18next 會回 key 本身
                expect(v.length).toBeGreaterThan(3);
            });
        });
    });
});
