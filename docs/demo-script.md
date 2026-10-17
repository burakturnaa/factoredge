# Demo Provası — Akış Senaryosu

Bu dosya, sunum sırasında izlenecek adımları ve "kesinti" testinin nasıl tetikleneceğini içerir. Sunumdan önce bu akış **2 kez** baştan sona prova edilmeli (bkz. plan §9, Gün 5).

## Ön hazırlık (sunumdan ~10 dk önce)

```bash
# 1) VM'i başlat (eğer kapalıysa) ve simülatörlerin ayakta olduğunu doğrula
VBoxManage startvm factoredge-vm --type headless
ssh -i ~/.ssh/factoredge-vm/id_ed25519 factoredge@192.168.58.5 "cd ~/factoredge-vm/vm && docker compose up -d"

# 2) Host'ta Postgres + backend + frontend
cd /Users/burakturna/Desktop/Projects/factorEdge
docker start factoredge-db
cd apps/api && npm run dev &
cd ../web && npm run dev &
```
Tarayıcıda `http://localhost:5173` açık tutulur, `admin`/`admin123` ile önceden giriş yapılmış olabilir.

## Akış

1. **Giriş ekranı** — `admin`/`admin123` ile giriş, dashboard'a yönlendirme.
2. **Dashboard** — iki bandın kartları: Bant Durumu, Üretim Adedi, Motor Sıcaklığı, Motor Akımı, Fire Adedi; her ikisi de "Bağlı" rozetiyle, değerlerin ~1 saniyede bir canlı güncellendiği gösterilir (sayfa yenilenmeden — Socket.IO).
3. **Geçmiş** — Bant 1 / Motor Sıcaklığı seçilir, son 1 saatlik grafik gösterilir. Farklı bir sinyal/cihaz seçilip grafiğin güncellendiği gösterilir.
4. **Kesinti senaryosu** (en kritik demo anı):
   ```bash
   ssh -i ~/.ssh/factoredge-vm/id_ed25519 factoredge@192.168.58.5 "docker stop bant1-modbus"
   ```
   - Dashboard'da Bant 1 rozeti birkaç saniye içinde "Kopuk"a döner, son veri zamanı donar.
   - **Bant 2'nin hiç etkilenmediği** özellikle vurgulanır (ayrı connector, hata izolasyonu).
   - Sayfa yenilenmeden bu geçiş gerçekleşir (Socket.IO `device:status` event'i).
   ```bash
   ssh -i ~/.ssh/factoredge-vm/id_ed25519 factoredge@192.168.58.5 "docker start bant1-modbus"
   ```
   - ~5 saniye içinde rozet kendiliğinden "Bağlı"ya döner, **hiçbir manuel müdahale olmadan** veri akışı devam eder.
5. **Cihaz yönetimi** (admin) — `/devices` sayfasında yeni bir MQTT cihazı eklenir (var olan broker'a işaret ederek), bağlandığı gösterilir, sonra silinir.
6. **Kullanıcı/rol yönetimi** (admin) — `/users` sayfasında yeni bir `viewer` kullanıcısı oluşturulur.
7. **Rol kısıtlaması** — çıkış yapılıp yeni viewer ile giriş yapılır: nav'da Cihazlar/Kullanıcılar linklerinin **gizli** olduğu gösterilir; URL'ye doğrudan `/devices` yazılırsa dashboard'a yönlendirildiği gösterilir (opsiyonel, zaman varsa).
8. **401/403 farkı** (opsiyonel, teknik derinlik göstermek için) — tarayıcı devtools'ta Network sekmesinde, token olmadan bir API isteğinin 401, viewer ile admin-only bir isteğin 403 döndüğü gösterilir.

## Yedek planlar

- **VM'e erişim sorunu çıkarsa**: host-Docker Compose fallback'i hazır tutulur —
  ```bash
  cd vm && docker compose up -d   # aynı docker-compose.yml, host'ta
  ```
  sonra devices tablosunda Bant1/Bant2'nin `config.host`/`config.brokerUrl` alanlarını `127.0.0.1`'e
  güncelleyin (admin → Cihazlar → Düzenle, ya da DB'den) — mimari/kod hiç değişmiyor, sadece hedef adres.
- Dashboard'da veri gelmiyorsa: `apps/api` loglarına bakılır (`ECONNREFUSED` ise simülatör/VM ayakta değil demektir), `curl http://localhost:3000/api/health` ile backend'in canlı olduğu doğrulanır, `ssh factoredge@192.168.58.5 docker ps` ile VM'deki container'lar kontrol edilir.
- Giriş yapılamıyorsa: `npm run prisma:seed` tekrar çalıştırılarak admin/viewer kullanıcılarının var olduğu doğrulanır (seed script upsert kullanır, tekrar çalıştırmak güvenlidir).
- VM yeniden başlatıldıysa (host Mac restart vb.): `VBoxManage startvm factoredge-vm --type headless` ile tekrar başlatılır, DHCP kirası genelde aynı IP'yi (`192.168.58.5`) korur ama garanti değildir — `ssh`'ın bağlanamaması durumunda VM konsoluna `VBoxManage controlvm factoredge-vm screenshotpng /tmp/check.png` ile bakılabilir.

## Prova geri bildirimi (her provadan sonra doldurulacak)

- [x] 1. prova — 2026-10-17 18:00 — Tüm 8 adım sorunsuz çalıştı: login→dashboard anlık geçiş, canlı veri güncellemesi gözle görülür, history grafiği cihaz/sinyal değişince doğru güncellendi, kesinti senaryosu (Bant1 durdu→Bant2 etkilenmedi→Bant1 kendiliğinden toparlandı) birebir beklendiği gibi, cihaz/kullanıcı CRUD + rol kısıtlaması (nav gizleme + route guard) hepsi çalıştı. **Tek bulgu**: "Cihaz Ekle" formunun varsayılan MQTT broker adresi hâlâ eski host-Docker IP'sini (`127.0.0.1`) gösteriyordu (VM'e taşımadan kalma) — `DevicesPage.vue`'da `VITE_SIMULATOR_HOST` ile düzeltildi, kod commit edildi. Demo akışı ~8 dakika sürdü.
- [ ] 2. prova — tarih/saat: ____ — sorunlar: ____
