import ws from 'k6/ws';
import { check } from 'k6';
import { Rate, Counter } from 'k6/metrics';
import { SharedArray } from 'k6/data';
if (!__ENV.BASE_URL || !__ENV.USERS_FILE || __ENV.CONFIRM_STAGING !== 'yes') throw new Error('Set BASE_URL, USERS_FILE and CONFIRM_STAGING=yes for authorized staging.');
const users = new SharedArray('socket accounts', () => JSON.parse(open(__ENV.USERS_FILE)));
if (!users.length) throw new Error('Provide test accounts with valid JWTs; optional friendId must refer to an accepted test friend.');
const authenticated = new Rate('socket_authenticated');
const incoming = new Counter('socket_messages_received');
export const options = { stages: [{ duration: '1m', target: 100 }, { duration: '2m', target: 500 }, { duration: '2m', target: 1000 }, { duration: '3m', target: 3000 }, { duration: '2m', target: 3000 }, { duration: '1m', target: 0 }],
    thresholds: { socket_authenticated: ['rate>0.99'], checks: ['rate>0.99'] } };
export default function () {
    const user = users[(__VU - 1) % users.length]; let ready = false;
    const url = __ENV.BASE_URL.replace(/^http/, 'ws').replace(/\/$/, '') + '/socket.io/?EIO=4&transport=websocket';
    const response = ws.connect(url, {}, socket => {
        socket.on('message', message => {
            if (message.startsWith('0')) socket.send('40' + JSON.stringify({ token: user.token }));
            else if (message === '2') socket.send('3');
            else if (message.startsWith('40')) ready = true;
            else if (message.startsWith('42') && message.includes('"receive_message"')) incoming.add(1);
        });
        socket.setInterval(() => {
            if (ready && user.friendId && __ENV.SEND_MESSAGES === 'yes') socket.send('42' + JSON.stringify(['send_message', { receiverId: user.friendId, messageText: 'Staging load check ' + __VU }]));
        }, 30000);
        socket.setTimeout(() => socket.close(), 60000);
    });
    authenticated.add(ready); check(response, { 'websocket upgrade': res => res && res.status === 101 });
}
