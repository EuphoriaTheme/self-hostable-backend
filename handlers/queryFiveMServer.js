import axios from 'axios';
import pingServer from './pingServer.js';

export default async function queryFiveMServer(ip, port) {
  try {
    const playerData = await axios.get(`http://${ip}:${port}/players.json`);
    const serverData = await axios.get(`http://${ip}:${port}/info.json`);
    const ping = await pingServer(ip, parseInt(port, 10));
    const players = (playerData.data || []).map((player) => {
      const identifiers = player.identifiers || [];
      const fivemId = identifiers.find((id) => id.startsWith('fivem')) || 'unknown';
      const discord = identifiers.find((id) => id.startsWith('discord')) || undefined;
      const steam = identifiers.find((id) => id.startsWith('steam')) || undefined;
      const identifier = identifiers.find((id) => id.startsWith('license')) || undefined;

      return {
        name: player.name,
        raw: {
          id: fivemId,
          discord,
          steam,
          identifier,
        },
        ping: player.ping,
      };
    });
    return {
      success: true,
      data: {
        players,
        maxplayers: parseInt(serverData?.data?.vars?.sv_maxClients || '0', 10),
        numplayers: Array.isArray(playerData.data) ? playerData.data.length : 0,
        ping,
      },
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
