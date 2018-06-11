const debug = require('debug')('test:header');
const puppeteer = require('puppeteer');
const sessionFactory = require('./factories/sessionFactory');
const userFactory = require('./factories/userFactory');

let browser, page;

beforeEach(async () => {
   
  browser = await puppeteer.launch({
    headless: false
  });

  page = await browser.newPage();
  await page.goto('localhost:3000');

});

afterEach(async () => {
  await browser.close();
});

test('The header has the correct text', async () => {
  debug('[ Running Test 1 ]');

  const text = await page.$eval('a.brand-logo', el => el.innerHTML);
  debug('[ - text: %s ]', text);

  expect(text).toEqual('Blogster');
});

test('Clicking login starts oauth flow', async () => {
  debug('[ Running Test 2 ]');

  await page.click('.right a');

  const url = await page.url();
  debug('[ - url: %s ]', url.substring(0,50));

  expect(url).toMatch(/accounts\.google\.com/);
});

test('When signed in, shows logout button', async () => {
  debug('[ Running Test 3 ]');

  const user = await userFactory();
  const { session, sig } = sessionFactory(user);

  await page.setCookie({ name: 'session', value: session});
  await page.setCookie({ name: 'session.sig', value: sig});
  await page.goto('localhost:3000');
  await page.waitFor('a[href="/auth/logout"]', { timeout: 5000 });

  const text = await page.$eval('a[href="/auth/logout"]', el => el.innerHTML);
  debug('[ - text: %s ]', text);

  expect(text).toEqual('Logout');
});
