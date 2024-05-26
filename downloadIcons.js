require('dotenv').config({path: '.env.local'});

// для работы с сетевыми запросами
const superagent = require('superagent');

// для формирования путей для выгрузки иконки
const path = require('path');

// для работы с файловой системой
const fs = require('fs/promises');

const {FIGMA_TOKEN} = process.env;

const FIGMA_API_HOST = 'https://api.figma.com/v1';
const FIGMA_KEY = '1TDMKALpzX0ByUE7Jo2Fw8';
const PAGE_NAME = 'Icons';
const BASE_DIR = '/public';

const agent = superagent.agent();


const uploadIcons = async () => {
    let figmaDocument;

    try {
        figmaDocument = (
            await agent
                .get(`${FIGMA_API_HOST}/files/${FIGMA_KEY}`)
                .set('X-FIGMA-TOKEN', FIGMA_TOKEN)
        ).body.document.children;
    } catch (error) {
        console.error(error);
        process.exit(1);
    }

    const folderNames = [];
    const icons = figmaDocument
        .find(({ name }) => name === PAGE_NAME)
        .children
        .reduce((acc, item) => {
            const { name: folderName, children } = item;
            folderNames.push(folderName);

            return [...acc, ...children];
        }, []);

    let iconsData;
    try {
        const iconUrls = (
            await agent
                .get(`${FIGMA_API_HOST}/images/${FIGMA_KEY}`)
                .query({
                    ids: icons.map(({ id }) => id).join(','),
                    format: 'svg',
                })
                .set('X-FIGMA-TOKEN', FIGMA_TOKEN)
        ).body.images;

        iconsData = icons.map(icon => ({
            ...icon,
            url: iconUrls[icon.id],
        }));
    } catch (error) {
        console.error(error);
        process.exit(1);
    }

    // Создание папок и сохранение каждой иконки в отдельную папку
    const BASE_DIR = 'icons'; // Базовая папка для сохранения иконок

    await Promise.all(iconsData.map(async icon => {
        const extension = '.svg';
        const iconSvg = (await agent.get(icon.url)).body;
        const iconName = `${icon.name.replaceAll(/ |\//g, '')}${extension}`;
        const folderPath = path.join(process.cwd(), BASE_DIR, icon.name); // Путь к папке для данной иконки

        await fs.mkdir(folderPath, { recursive: true }); // Создаем папку рекурсивно

        await fs.writeFile(
            path.join(folderPath, iconName),
            iconSvg,
        );
    }));

    console.log('Icons downloaded and saved successfully');
};


uploadIcons();
