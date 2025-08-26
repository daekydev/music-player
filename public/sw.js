self.addEventListener('install', e=>self.skipWaiting());
        self.addEventListener('activate', e=>self.clients.claim());
        self.addEventListener('notificationclick', function(event){
          event.notification.close();
          const action = event.action || 'default';
          event.waitUntil(
            clients.matchAll({includeUncontrolled:true, type:'window'}).then(function(clientList){
              if(clientList.length>0){
                clientList[0].postMessage({type:'notification-action', action:action});
              } else {
                clients.openWindow('/');
              }
            })
          );
        });
