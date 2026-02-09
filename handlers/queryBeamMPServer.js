import net from 'net';
import pingServer from './pingServer.js';

export default function queryBeamMPServer(ip, port, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    let responseData = '';
    const pingPromise = pingServer(ip, parseInt(port, 10));

    client.setTimeout(timeout);

    client.connect(parseInt(port, 10), ip, () => {
      console.log(`Connected to BeamMP server at ${ip}:${port}`);
      const message = Buffer.from('I', 'ascii');
      client.write(message);
    });

    client.on('data', (data) => {
      if (responseData === '') {
        const size = data.readInt32LE(0);
        console.log(`Expected response size: ${size}`);
        responseData = data.slice(4).toString('ascii');
      } else {
        responseData += data.toString('ascii');
      }
    });

    client.on('close', async () => {
      console.log('Connection to BeamMP server closed.');

      if (responseData) {
        try {
          // Replace backslashes in the response data
          const sanitizedData = responseData.replace(/\\/g, '');

          // Parse the sanitized data as JSON
          const parsedData = JSON.parse(sanitizedData);

          // Format the players list if it exists.
          let players = [];
          if (Array.isArray(parsedData.playerslist)) {
            players = parsedData.playerslist.filter((player) => String(player).trim() !== '');
          } else if (typeof parsedData.playerslist === 'string') {
            players = parsedData.playerslist
              .split(';')
              .map((player) => player.trim())
              .filter((player) => player !== '');
          }

          const maxplayersRaw = parsedData.maxplayers ?? parsedData.maxPlayers ?? parsedData.max_clients;
          const maxplayers = Number.isFinite(Number(maxplayersRaw)) ? Number(maxplayersRaw) : 0;
          const numplayersRaw = parsedData.numplayers ?? parsedData.players ?? parsedData.playersCount;
          const numplayers = Number.isFinite(Number(numplayersRaw)) ? Number(numplayersRaw) : players.length;
          const ping = await pingPromise;

          resolve({
            players,
            maxplayers,
            numplayers,
            ping,
          });
        } catch (error) {
          console.error('Error parsing BeamMP server response:', error.message);
          reject(new Error('Failed to parse server response.'));
        }
      } else {
        resolve(null); // No data received
      }
    });

    client.on('error', (error) => {
      console.error(`Error connecting to BeamMP server: ${error.message}`);
      reject(error);
    });

    client.on('timeout', () => {
      console.error('Connection to BeamMP server timed out.');
      client.destroy();
      reject(new Error('Connection timed out.'));
    });
  });
}