import { IP2Location } from 'ip2location-nodejs';

const ip2location = new IP2Location();

ip2location.open('./IP2LOCATION-LITE-DB3.IPV6.BIN');

const testip = ['8.8.8.8', '2404:6800:4001:c01::67'];

for (let x = 0; x < testip.length; x++) {
  const result = ip2location.getAll(testip[x]);
  for (const key in result) {
    console.log(key + ': ' + result[key]);
  }
  console.log('--------------------------------------------------------------');
}

ip2location.close();
