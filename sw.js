// 봄날 English PWA 서비스 워커
const CACHE_NAME = 'bomnal-english-v1';

// 오프라인에서도 쓸 수 있게 캐시할 파일들
const CACHE_FILES = [
  './',
  './index.html',
  './select.html',
  './quiz.html',
  './mypage.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// 설치: 핵심 파일 캐시
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] 캐시 설치 중...');
      return cache.addAll(CACHE_FILES).catch(err => {
        console.warn('[SW] 일부 파일 캐시 실패 (무시):', err);
      });
    })
  );
  self.skipWaiting();
});

// 활성화: 이전 버전 캐시 삭제
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] 이전 캐시 삭제:', key);
            return caches.delete(key);
          })
      )
    )
  );
  self.clients.claim();
});

// 요청 가로채기: 캐시 우선, 없으면 네트워크
self.addEventListener('fetch', event => {
  // Firebase, Google TTS 등 외부 요청은 항상 네트워크
  if (
    event.request.url.includes('firestore.googleapis.com') ||
    event.request.url.includes('firebase') ||
    event.request.url.includes('translate.google.com') ||
    event.request.url.includes('gstatic.com')
  ) {
    return; // 그냥 네트워크로
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached; // 캐시 있으면 즉시 반환
      // 없으면 네트워크에서 가져오고 캐시에 저장
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const toCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, toCache);
        });
        return response;
      }).catch(() => {
        // 네트워크도 안 되면 index.html 반환 (오프라인 폴백)
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
