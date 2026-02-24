const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');

(async () => {
  let html = fs.readFileSync('test.html', 'utf-8');
  // remove external stylesheet links and Chart.js script to avoid network fetch errors in jsdom
  html = html.replace(/<link[^>]+rel=['\"]stylesheet['\"][^>]*>/g, '');
  html = html.replace(/<script[^>]*chart\.js[^>]*><\/script>/g, '');
  const virtualConsole = new VirtualConsole();
  // forward logs and errors from page to Node console
  ['log','info','warn','error'].forEach(ev => {
    virtualConsole.on(ev, msg => console.log(`[page ${ev}]`, msg));
  });
  virtualConsole.on('jsdomError', err => console.error('[jsdom error]', err));

  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    resources: 'usable',
    url: 'http://localhost:8000/',
    virtualConsole,
    beforeParse(window) {
      window.sessionStorage.setItem('gameConfig', JSON.stringify({
        startingCapital: 1234,
        riskLevel: 'aggressive', // valid: conservative, moderate, aggressive
        mode: 'challenge',
        difficulty: 'hard',      // valid: easy, medium, hard
        showDayCounter: true      // enable the new feature
      }));
      console.log('[beforeParse] preset sessionStorage gameConfig');
    }
  });

  // wrap initializeGame to log invocation
  const origInit = dom.window.initializeGame;
  if (origInit) {
    dom.window.initializeGame = function(...args) {
      console.log('[JSDOM] initializeGame invoked');
      return origInit.apply(this, args);
    };
  }

  // (optional) fetch and dump server copy of enhanced-simulator.js for debugging
  // disabled to reduce output size

  // Wait for scripts to load
  function wait(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  // wait a short time for DOMContentLoaded and scripts to execute
  dom.window.document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM content loaded event');
  });
  await wait(2500);

  const { window } = dom;

  // stub prompt so chat widget does not block
  window.prompt = function(msg) {
    console.log('[jsdom-test] prompt called:', msg);
    return 'test-key';
  };
  // avoid real network for openai during tests
  window.fetch = function() {
    return Promise.resolve({ json: () => ({ choices:[{message:{content:'[stub reply]'}}] }) });
  };
  // capture any runtime errors
  window.addEventListener('error', e => {
    console.error('JSDOM error', e.error || e.message);
  });

  // wait extra time for scripts to load completely
  await wait(8000);

  // manually trigger initialization in case DOMContentLoaded listeners missed
  if (window.loadConfig && window.initializeGame) {
    try {
      console.log('[jsdom-test] manually calling loadConfig/initializeGame');
      window.loadConfig();
      window.initializeGame();
    } catch (e) {
      console.error('[jsdom-test] error during manual init', e);
    }
  } else {
    console.warn('[jsdom-test] loadConfig/initializeGame not yet defined');
  }

  // try again after a bit if simulator not yet defined
  let sim = window.simulator;
  if (!sim) {
    await wait(2000);
    sim = window.simulator;
  }

  console.log('simulator exists?', !!sim);

  // test speed effects
  if (sim) {
    console.log('initial simulatedTime', sim.getSimulatedTime());
    console.log('initial dayCounter', window.document.getElementById('dayCounter')?.textContent);

    console.log('[jsdom-test] setting speed to 10x');
    window.setSpeed(10);
    await wait(300); // wait 0.3s
    console.log('after 10x, simulatedTime', sim.getSimulatedTime(), 'dayCounter', window.document.getElementById('dayCounter')?.textContent);

    console.log('[jsdom-test] setting speed to 0.15x');
    window.setSpeed(0.15);
    await wait(3000); // wait 3 seconds
    console.log('after 0.15x, simulatedTime', sim.getSimulatedTime(), 'dayCounter', window.document.getElementById('dayCounter')?.textContent);
  }
  if (sim) {
    try {
      console.log('stocks count', sim.getStocks().length);
    } catch (e) {
      console.error('error inspecting simulator', e);
    }
  }

  // run custom mode scenario to check week limit handling
  if (sim) {
    console.log('[jsdom-test] switching to custom mode');
    window.gameConfig.mode = 'custom';
    window.gameConfig.weeks = 2;
    window.gameConfig.startingCapital = 10000;
    // reinitialize simulator with new config
    window.initializeGame();
    const sim2 = window.simulator;
    console.log('custom sim starting capital', sim2.config.startingCapital);
    console.log('custom sim weeks', sim2.config.weeks);
    console.log('weeks remaining', sim2.weeksRemaining());

    // advance a few days and verify weeks decrease
    sim2.updatePrices(7); // one week
    console.log('after 1 week, weeksLeft', sim2.weeksRemaining());
    sim2.updatePrices(7); // second week
    console.log('after 2 weeks, weeksLeft', sim2.weeksRemaining());
    sim2.updatePrices(1);
    console.log('after extra day, weeksLeft (should stay 0)', sim2.weeksRemaining());
  }
  console.log('window.gameConfig', window.gameConfig);
  console.log('sessionStorage gameConfig', window.sessionStorage.getItem('gameConfig'));
  const grid = window.document.getElementById('stocksGrid');
  console.log('stocksGrid children', grid ? grid.children.length : 'no grid');
  const dayCounter = window.document.getElementById('dayCounter');
  console.log('dayCounter text', dayCounter ? dayCounter.textContent : 'none');
  console.log('sessionStorage keys', Object.keys(window.sessionStorage));
})();
