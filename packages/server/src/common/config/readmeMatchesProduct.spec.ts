import * as fs from 'fs';
import * as path from 'path';

/**
 * Н2 карты v38. Инструкция обещает ровно то, что продукт делает.
 *
 * README называл базой данных PostgreSQL — дважды, в требованиях и в
 * описании стека. Продукт работает на MySQL/MariaDB: в `docker-compose.yml`
 * образ mariadb, драйвер `mysql`, в `.env.example` переменные MySQL.
 * Человек, идущий по инструкции, ставил не ту базу.
 *
 * Он же читал «Docker (рекомендуется): docker compose up -d, после старта
 * откройте localhost:80» — а в том файле только окружение (база, Redis,
 * служба печати), ни сервера, ни витрины. Открывать на том адресе нечего.
 */
const ROOT = path.resolve(__dirname, '../../../../..');

const read = (name: string): string =>
  fs.readFileSync(path.join(ROOT, name), 'utf8');

describe('инструкция и продукт', () => {
  it('файлы продукта на месте', () => {
    // Иначе проверки ниже стали бы пустыми и зелёными.
    expect(read('README.md').length).toBeGreaterThan(500);
    expect(read('docker-compose.yml')).toContain('services:');
  });

  it('README называет ту базу данных, на которой продукт работает', () => {
    const readme = read('README.md');
    const compose = read('docker-compose.yml');

    const промахи: string[] = [];

    if (/postgres/i.test(readme) && !/postgres/i.test(compose)) {
      промахи.push('README называет PostgreSQL, которого нет в docker-compose');
    }
    if (/mariadb|mysql/i.test(compose) && !/mariadb|mysql/i.test(readme)) {
      промахи.push('README не называет базу, которую поднимает docker-compose');
    }

    expect(промахи).toEqual([]);
  });

  it('README не зовёт открывать адрес, на котором никого нет', () => {
    const readme = read('README.md');
    const compose = read('docker-compose.yml');

    // Витрину в compose узнаём по имени службы.
    const composeПоднимаетВитрину = /^\s{2}webapp:/m.test(compose);
    const readmeОбещаетАдресПослеCompose =
      /docker compose up[\s\S]{0,400}?localhost:80\b/.test(readme);

    expect(readmeОбещаетАдресПослеCompose && !composeПоднимаетВитрину).toBe(
      false,
    );
  });
});
