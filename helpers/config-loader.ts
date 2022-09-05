import fs from 'fs';
import path from 'path';

export const loadConfig = () => {
  const filename = '../config.json';
  let data;
  try {
    const configFile = path.join(__dirname, filename);
    const file = fs.readFileSync(configFile).toString();
    data = JSON.parse(file);
  } catch (err) {
    console.error(err);
    throw new Error(
      'You have not set correctly the config file, make sure to place a correct config file with name `config.json`.'
    );
  }
  return data;
};
