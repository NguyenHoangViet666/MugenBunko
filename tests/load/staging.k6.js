import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
const base = (__ENV.BASE_URL || '').replace(/\/$/, '');
if (!/^https?:\/\//.test(base) || __ENV.CONFIRM_STAGING !== 'yes') throw new Error('Set BASE_URL and CONFIRM_STAGING=yes for an authorized staging environment.');
const users = new SharedArray('staging accounts', () => __ENV.USERS_FILE ? JSON.parse(open(__ENV.USERS_FILE)) : []);
export const options = {
    scenarios: { readers: { executor: 'ramping-vus', startVUs: 0, gracefulRampDown: '30s',
        stages: [{ duration: '1m', target: 100 }, { duration: '2m', target: 500 }, { duration: '2m', target: 1000 }, { duration: '3m', target: 3000 }, { duration: '2m', target: 3000 }, { duration: '1m', target: 0 }] } },
    thresholds: { http_req_failed: ['rate<0.01'], http_req_duration: ['p(95)<1000', 'p(99)<2500'], checks: ['rate>0.99'] },
};
export default function () {
    const user = users.length ? users[(__VU - 1) % users.length] : null;
    const slot = Math.floor(Math.random() * 10);
    let endpoint = slot < 5 ? '/novels/catalog?limit=12&page=' + (Math.floor(Math.random() * 10) + 1) : slot < 7 ? '/novels/home' : slot < 9 ? '/forum/posts?comments=none&limit=20' : '/chapters/' + (__ENV.CHAPTER_ID || 1);
    if (user && slot === 9) endpoint = '/reader/progress/' + (__ENV.NOVEL_ID || 1);
    const response = user && slot === 9
        ? http.put(base + '/api' + endpoint, JSON.stringify({ chapterId: Number(__ENV.CHAPTER_ID || 1), scrollRatio: .5, paragraphIndex: 4, paragraphOffset: .1, updatedAt: Date.now() }),
            { headers: { Authorization: 'Bearer ' + user.token, 'Content-Type': 'application/json' }, tags: { name: 'PUT progress' } })
        : http.get(base + '/api' + endpoint, { tags: { name: endpoint.split('?')[0].replace(/\/\d+$/, '/:id') } });
    check(response, { 'successful response': res => res.status === 200 });
    sleep(1 + Math.random() * 4);
}
