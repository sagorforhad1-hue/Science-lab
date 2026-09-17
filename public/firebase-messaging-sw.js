self.addEventListener('push',event=>{let data;try{data=event.data.json();}catch{return;}const n=data.notification||data.data||{};event.waitUntil(self.registration.showNotification(n.title||'Science Lab',{body:n.body||'',icon:'/favicon.svg',data:{url:'/'}}));});
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil(clients.openWindow('/'));});
