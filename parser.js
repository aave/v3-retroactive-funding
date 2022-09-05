const fs = require('fs');
const ethers = require('ethers');

(() => {
  const data = fs.readFileSync('./data.txt', 'utf8');
  const lines = data.split('\n');
  const parsed = {
    ethereum: [],
    polygon: [],
    avalanche: [],
  };
  //   console.log(lines)
  for (line of lines) {
    const parts = line.split('  ');
    const info = {
      symbol: parts[1],
      aToken: parts[2],
      decimals: parts[3],
      amount: parts[4],
      fullAmount: ethers.utils.parseUnits(parts[4], parts[3]).toString(),
    };
    if (parts[0] == 'MATIC') {
      parsed.polygon.push(info);
    } else if (parts[0] == 'AVAX') {
      parsed.avalanche.push(info);
    } else {
      parsed.ethereum.push(info);
    }
  }

  fs.writeFileSync('./data.json', JSON.stringify(parsed, null, 2));

  console.log('Ethereum:');
  for (const item of parsed.ethereum) {
    console.log(`${item.fullAmount}; // ${item.amount} ${item.symbol}`);
  }
  console.log('Polygon:');
  for (const item of parsed.polygon) {
    console.log(`${item.fullAmount}; // ${item.amount} ${item.symbol}`);
  }
})();
