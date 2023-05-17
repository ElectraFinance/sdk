import Electra from '../Electra/index.js';

describe('Aggregator', () => {
  test('Handle error aus', async () => {
    const electra = new Electra('testing');
    const bscUnit = electra.getUnit('bsc')

    let subId: string;

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        bscUnit.aggregator.ws.unsubscribe(subId);
        bscUnit.aggregator.ws.destroy()
        reject(new Error('Timeout'));
      }, 10000);
      // bscUnit.aggregator.ws.onError = console.error;
      const payload = 'adsv-sdfb';
      subId = bscUnit.aggregator.ws.subscribe('aus', {
        payload,
        callback: () => null,
        errorCb: (message) => {
          expect(message).toContain(`Address '${payload}' is not hexadecimal`);
          clearTimeout(timeout);
          bscUnit.aggregator.ws.destroy()
          resolve(true);
        }
      })
    });
  });

  test('Handle error aobus', async () => {
    const electra = new Electra('testing');
    const bscUnit = electra.getUnit('bsc')

    let subId: string;

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        bscUnit.aggregator.ws.unsubscribe(subId);
        bscUnit.aggregator.ws.destroy()
        reject(new Error('Timeout'));
      }, 10000);
      const payload = 'BTCUSDF';
      subId = bscUnit.aggregator.ws.subscribe('aobus', {
        payload,
        callback: () => null,
        errorCb: (message) => {
          console.log(message);
          clearTimeout(timeout);
          bscUnit.aggregator.ws.destroy()
          resolve(true);
        }
      })
    });
  });
});
