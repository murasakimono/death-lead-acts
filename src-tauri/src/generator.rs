use crate::models::*;
use rand::seq::SliceRandom;
use rand::{Rng, SeedableRng};
use rand_chacha::ChaCha8Rng;
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};

fn hash_seed(seed: &str) -> u64 {
    let mut h = DefaultHasher::new();
    seed.trim().to_uppercase().hash(&mut h);
    h.finish()
}

fn format_min(min_from_19: u32) -> String {
    let total = 19 * 60 + min_from_19;
    let hh = (total / 60) % 24;
    let mm = total % 60;
    format!("{:02}:{:02}", hh, mm)
}

struct VenueTemplate {
    name: &'static str,
    subtitle: &'static str,
    victim_roles: [&'static str; 2],
    rooms: [(&'static str, &'static str, f32, f32, f32, f32, bool, f32); 5],
}

const VENUES: [VenueTemplate; 6] = [
    VenueTemplate {
        name: "Özel Koru Hastanesi — 4. Kat Cerrahi Blok",
        subtitle: "Gece Nöbeti • Kartlı Erişim Bölgesi",
        victim_roles: ["Başhekim Yardımcısı", "Klinik Toksikoloji Şefi"],
        rooms: [
            ("r1", "Başhekim Odası", 6.0, 8.0, 38.0, 36.0, false, 0.0),
            ("r2", "İlaç & Narkotik Deposu", 48.0, 8.0, 46.0, 26.0, true, 135.0),
            ("r3", "Cerrahi Koridor", 6.0, 48.0, 88.0, 16.0, true, 15.0),
            ("r4", "Gözlem Odası", 6.0, 68.0, 40.0, 24.0, false, 0.0),
            ("r5", "Arşiv & Sunucu Odası", 50.0, 68.0, 44.0, 24.0, true, 220.0),
        ],
    },
    VenueTemplate {
        name: "Bebek Sahil Malikânesi — Üst Kat",
        subtitle: "Özel Davet Gecesi • Kapalı Güvenlik Çemberi",
        victim_roles: ["Holding Yönetim Kurulu Başkanı", "Sanat Koleksiyoneri"],
        rooms: [
            ("r1", "Çalışma & Kütüphane", 6.0, 8.0, 40.0, 38.0, false, 0.0),
            ("r2", "Kasa Odası", 50.0, 8.0, 44.0, 28.0, true, 150.0),
            ("r3", "Ana Galeri Koridoru", 6.0, 50.0, 88.0, 14.0, true, 0.0),
            ("r4", "Boğaz Terası", 6.0, 68.0, 44.0, 24.0, false, 0.0),
            ("r5", "Güvenlik Kontrol", 54.0, 68.0, 40.0, 24.0, true, 200.0),
        ],
    },
    VenueTemplate {
        name: "Grand Pera Otel — 14. Kat VIP Süit",
        subtitle: "Kilitli Kat • Elektronik Kart Kayıtlı",
        victim_roles: ["Kıdemli Finans Denetçisi", "Uluslararası Arabulucu"],
        rooms: [
            ("r1", "1401 Kral Dairesi", 6.0, 8.0, 44.0, 38.0, false, 0.0),
            ("r2", "Özel Toplantı Salonu", 54.0, 8.0, 40.0, 30.0, true, 140.0),
            ("r3", "14. Kat Koridoru", 6.0, 50.0, 88.0, 14.0, true, 10.0),
            ("r4", "Servis & Yangın Merdiveni", 6.0, 68.0, 40.0, 24.0, true, 320.0),
            ("r5", "Kat Şefliği Ofisi", 50.0, 68.0, 44.0, 24.0, false, 0.0),
        ],
    },
    VenueTemplate {
        name: "Karaköy Yeraltı Kayıt Stüdyosu",
        subtitle: "Ses Yalıtımlı Kompleks • Gece Seansı",
        victim_roles: ["Bağımsız Plak Şirketi Kurucusu", "Baş Prodüktör"],
        rooms: [
            ("r1", "Kayıt Kabini A", 6.0, 8.0, 38.0, 36.0, false, 0.0),
            ("r2", "Ana Miks Konsolu", 48.0, 8.0, 46.0, 32.0, true, 160.0),
            ("r3", "Akustik Koridor", 6.0, 48.0, 88.0, 14.0, true, 20.0),
            ("r4", "Dinlenme Salonu", 6.0, 66.0, 42.0, 26.0, false, 0.0),
            ("r5", "Ekipman & Arka Çıkış", 52.0, 66.0, 42.0, 26.0, true, 240.0),
        ],
    },
    VenueTemplate {
        name: "Maslak Ar-Ge Kulesi — 22. Kat",
        subtitle: "Biyometrik Erişim • Gece Mesaisi",
        victim_roles: ["Siber Güvenlik Direktörü", "Baş Sistem Mimarı"],
        rooms: [
            ("r1", "Direktör Ofisi", 6.0, 8.0, 40.0, 36.0, false, 0.0),
            ("r2", "Soğuk Sunucu Odası", 50.0, 8.0, 44.0, 30.0, true, 120.0),
            ("r3", "Merkez Koridor", 6.0, 48.0, 88.0, 15.0, true, 5.0),
            ("r4", "Strateji Odası", 6.0, 67.0, 42.0, 25.0, false, 0.0),
            ("r5", "Biyometrik Lobi", 52.0, 67.0, 42.0, 25.0, true, 210.0),
        ],
    },
    VenueTemplate {
        name: "M/Y Kutup Yıldızı — Özel Yat",
        subtitle: "Açık Deniz • Sınırlı Mürettebat",
        victim_roles: ["Armatör & Yat Sahibi", "Deniz Hukuku Danışmanı"],
        rooms: [
            ("r1", "Ana Kamara", 6.0, 8.0, 42.0, 36.0, false, 0.0),
            ("r2", "Kaptan Köşkü", 52.0, 8.0, 42.0, 28.0, true, 145.0),
            ("r3", "Orta Güverte Geçidi", 6.0, 48.0, 88.0, 15.0, true, 0.0),
            ("r4", "Arka Güverte", 6.0, 67.0, 44.0, 25.0, false, 0.0),
            ("r5", "Makine & Depo", 54.0, 67.0, 40.0, 25.0, true, 230.0),
        ],
    },
];

const CRIME_TYPES: [(&str, &str, &str); 6] = [
    ("CİNAYET", "AĞIR CEZA // CİNAYET", "ölü bulundu"),
    ("BÜYÜK SOYGUN & GASP", "ORGANİZE // KASA GASPI", "ağır darpla etkisiz hale getirilmiş ve kasası boşaltılmış halde bulundu"),
    ("SİYASİ KOMPLO & ŞANTAJ", "İSTİHBARAT // SİYASİ DOSYA", "kritik gizli belgeler çalındıktan sonra şüpheli biçimde ölü bulundu"),
    ("ŞÜPHELİ İNTİHAR SÜSÜ", "ADLİ TIP // ŞÜPHELİ ÖLÜM", "intihar notu bırakılmış halde ölü bulundu — ancak adli bulgular çelişiyor"),
    ("KURUMSAL SABOTAJ", "MALİ & ADLİ // SABOTAJ", "sistem/ilaç sabotajı sırasında müdahale ederken etkisiz hale getirilip ölü bulundu"),
    ("ÇİFTE PLAN & İHANET", "ÖZEL BÜRO // KARMAŞIK VAKA", "planlı bir tuzak sonucu kilitli odada ölü bulundu"),
];

struct ForensicMethodSpec {
    name: &'static str,
    summary_template: &'static str,
    onset_delay_min: u32,
    requires_handedness: bool,
    uv_trace_title: &'static str,
    uv_trace_detail: &'static str,
    forensic_notes: &'static str,
}

const METHODS: [ForensicMethodSpec; 6] = [
    ForensicMethodSpec {
        name: "Gecikmeli Potasyum Klorür / Toksikoloji",
        summary_template: "Kurbanın içeceğine karıştırılan gecikmeli etkili toksin, alımdan 30 dakika sonra kardiyak arreste yol açtı.",
        onset_delay_min: 30,
        requires_handedness: false,
        uv_trace_title: "UV: Bardak Kenarı & Eldiven Kalıntısı",
        uv_trace_detail: "UV 365nm altında çalışma masası ve çöp kutusu kenarında kristalize şeffaf ampul kalıntısı tespit edildi. Etken madde alımdan ~30 dk sonra etki ediyor.",
        forensic_notes: "Dış travma yok. Konjonktival peteşi minimal. Toksikoloji ön taramasında gecikmeli kardiyotoksik ajan şüphesi (etki başlangıcı +30 dk).",
    },
    ForensicMethodSpec {
        name: "Künt Travma (Yara Açısı & El Yatkınlığı)",
        summary_template: "Ağır metal cisimle tek darbe; darbe açısı failin belirgin el yatkınlığını kesin olarak gösteriyor.",
        onset_delay_min: 0,
        requires_handedness: true,
        uv_trace_title: "UV: Silinmiş Kan Sıçrama Vektörü",
        uv_trace_detail: "Duvar yüzeyinde kimyasalla temizlenmeye çalışılmış yüksek hızlı kan sıçrama izi UV altında belirginleşti. Açı analizi darbenin yönünü ve failin el yatkınlığını doğruluyor.",
        forensic_notes: "Parietal bölgede 4.2 cm çökme kırığı. Darbe açısı aşağıdan yukarı hafif oblik; failin el yatkınlığı ile birebir örtüşüyor. Savunma yarası yok.",
    },
    ForensicMethodSpec {
        name: "Kesici Alet + Yakın Mesafe Saldırı",
        summary_template: "Tek hamlede subklavyen arter kesisi; savunma izi olmaması kurbanın faili yakınına aldığını kanıtlıyor.",
        onset_delay_min: 0,
        requires_handedness: true,
        uv_trace_title: "UV: Lavaboda Seyreltilmiş Kan İzi",
        uv_trace_detail: "Oda içi lavabo giderinde luminol/UV reaksiyonu pozitif. Fail olay sonrası kesici aleti ve elini hızla yıkamış; kan sıçrama paterni failin el yatkınlığını ele veriyor.",
        forensic_notes: "11 cm derinliğinde tek kesici-delici yara. Eller ve önkollarda savunma kesisi yok. Yara kanalı eğimi failin dominant elini netleştiriyor.",
    },
    ForensicMethodSpec {
        name: "Ölümcül İlaç Etkileşimi / Doz Aşımı",
        summary_template: "Kurbanın düzenli kullandığı kalp ilacıyla etkileşen enjeksiyon, kaza süsü verilerek uygulandı.",
        onset_delay_min: 20,
        requires_handedness: false,
        uv_trace_title: "UV: Enjektör Kapağı & Flakon İzi",
        uv_trace_detail: "UV taramada koltuk altında silik parmak izli kırık flakon boynu ve şeffaf sıvı damlacıkları parladı. Ajan uygulamadan ~20 dk sonra solunum depresyonu yapıyor.",
        forensic_notes: "Sol antekubital fossada taze iğne giriş deliği. Kurbanın kendi kullandığı reçeteli ilaçla sinerjik solunum baskılanması (gecikme ~20 dk).",
    },
    ForensicMethodSpec {
        name: "Karbonmonoksit / Kapalı Alan Boğulması",
        summary_template: "Havalandırma menfezine dışarıdan gaz verilip kapı mekanizması kilitlendi.",
        onset_delay_min: 15,
        requires_handedness: false,
        uv_trace_title: "UV: Havalandırma Menfezi Sızdırmazlık Bandı",
        uv_trace_detail: "Menfez kenarında UV altında parlayan endüstriyel yapıştırıcı kalıntısı ve taze metal çizikleri bulundu. Gaz salınımı ölüm anından ~15 dk önce başlatılmış.",
        forensic_notes: "Kiraz kırmızısı livor mortis (karboksihemoglobin > %62). Kapı içten değil, dış elektronik kilitten bloke edilmiş.",
    },
    ForensicMethodSpec {
        name: "İntihar Süsü Verilmiş Boğma & Yer Değiştirme",
        summary_template: "Kurban önce etkisiz hale getirilip boğuldu, ardından intihar süsü vermek için konumu değiştirildi.",
        onset_delay_min: 0,
        requires_handedness: true,
        uv_trace_title: "UV: Zeminde Sürükleme & Eldiven İzi",
        uv_trace_detail: "UV ışık altında halı/zemin üzerinde 2.4 metrelik sürükleme izi ve bilek bağı lifleri ortaya çıktı. İntihar senaryosu tamamen çürüdü.",
        forensic_notes: "Hyoid kemik kırığı ve boyunda yatay ligatür izi. Livor mortis dağılımı cesedin ölümden sonra hareket ettirildiğini kanıtlıyor.",
    },
];

const VICTIM_NAMES: [&str; 10] = [
    "Haluk Karahan",
    "Selim Aksoy",
    "Demirhan Soylu",
    "Nadir Erdem",
    "Orhan Tekin",
    "Cemil Alkan",
    "Bülent Koral",
    "Fikret Yılmazer",
    "Tarik Özgür",
    "Kenan Sancar",
];

const SUSPECT_POOL: [(&str, &str, u8, &str, &str, &str); 10] = [
    ("Dr. Zeynep Arslan", "Kıdemli Uzman", 36, "A+", "Soğukkanlı & Hesapçı", "#38BDF8"),
    ("Kerem Yalçın", "Finans Direktörü", 41, "0+", "Gergin & Savunmacı", "#F59E0B"),
    ("Derya Kılıç", "Özel Kalem / Asistan", 29, "B+", "Gözlemci & Temkinli", "#A78BFA"),
    ("Mertcan Doğan", "Güvenlik Şefi", 44, "AB+", "Otoriter & Ketum", "#F87171"),
    ("Seda Tunç", "Ortak / Hukuk Danışmanı", 38, "0-", "Keskin & Manipülatif", "#34D399"),
    ("Emre Çelik", "Sistem Mühendisi", 31, "A-", "Analitik & Mesafeli", "#60A5FA"),
    ("Nazlı Demir", "Araştırma Görevlisi", 27, "B-", "Hırslı & Paniklemeye Meyilli", "#FB7185"),
    ("Volkan Kaya", "Eski İş Ortağı", 47, "A+", "Alaycı & Sinirli", "#FBBF24"),
    ("İrem Şahin", "Yönetici Asistanı", 33, "0+", "Sakin & Gizemli", "#C084FC"),
    ("Barış Öztürk", "Teknik Sorumlu", 39, "AB-", "İçe Dönük & Titiz", "#2DD4BF"),
];

const MOTIVES: [(&str, &str); 5] = [
    (
        "Zimmet & Gizli Denetim Raporu",
        "Kurbanın kasasında şüphelinin 14 milyon TL'lik usulsüz transferini belgeleyen ve sabah savcılığa verilecek olan imzalı denetim raporu bulundu.",
    ),
    (
        "Şantaj & Eski Dosya",
        "Kurban, şüphelinin 3 yıl önceki ölümlü ihmal olayındaki gizli rolünü belgeleyen ses kaydıyla haftalardır şantaj yapıyordu.",
    ),
    (
        "Vasiyet & Hisse Devri İptali",
        "Kurbanın avukatına gönderdiği son taslakta şüphelinin tüm ortaklık payını sıfırladığı ve sabah noter randevusu aldığı ortaya çıktı.",
    ),
    (
        "Çalıntı Patent / Telif Skandalı",
        "Kurban, şüphelinin tüm kariyerini kurduğu projenin çalıntı olduğunu kanıtlayan ham kaynak kayıtlarını basına sızdırmak üzereydi.",
    ),
    (
        "Siyasi İhale & Rüşvet Ağı",
        "Kurban, şüphelinin yürüttüğü gizli komisyon ağını ifşa edecek şifreli dekontları ele geçirmişti.",
    ),
];

const DIRTY_SECRETS: [(&str, &str, &str); 4] = [
    (
        "Kasa Hırsızlığı Girişimi",
        "Asıl suçla alakam yok! Sadece o gece kasa odasına girip borç senedimi almaya çalıştım, kapı kilitliydi geri döndüm!",
        "Gece koridorunda görülme sebebi cinayet değil, kendi borç senedini çalma girişimiydi.",
    ),
    (
        "Yasak İlişki & Gizli Buluşma",
        "Tamam, yalan söyledim! Evde değildim, gizli bir buluşmadaydım — ortaya çıkarsa evliliğim biterdi ama kimseye zarar vermedim!",
        "Alibisindeki çelişki asıl suçtan değil, sakladığı gizli ilişkiden kaynaklanıyor.",
    ),
    (
        "Kurum İçi Bilgi Sızdırma",
        "Rakip firmaya dosya satıyordum, kabul ediyorum! Sunucu odasına o yüzden girdim ama kurbanın odasına adım bile atmadım!",
        "Sunucu/arşiv kaydındaki izi cinayet için değil, rakip şirkete veri sızdırmak içindi.",
    ),
    (
        "Yasadışı Bahis & Borç Tahsilatı",
        "Kurbanla o gece tartıştık evet, çünkü kumar borcum yüzünden beni kovacaktı. Ama koridordan çıktığımda hâlâ hayattaydı!",
        "Kurbanla sert tartışması olay anından önceydi; korktuğu için bunu gizledi.",
    ),
];

pub fn generate_case(seed: &str, difficulty: &str) -> (CaseFile, CaseTruth) {
    let clean_seed = if seed.trim().is_empty() {
        "DLA-7F3K9".to_string()
    } else {
        seed.trim().to_uppercase()
    };
    let clean_diff = match difficulty {
        "homicide" | "timed" => difficulty.to_string(),
        _ => "detective".to_string(),
    };
    let (max_hints, max_reputation, time_limit_sec) = match clean_diff.as_str() {
        "homicide" => (0u8, 3u8, None),
        "timed" => (2u8, 4u8, Some(900u32)),
        _ => (3u8, 5u8, None),
    };

    let mut rng = ChaCha8Rng::seed_from_u64(hash_seed(&clean_seed));

    let venue_index = match clean_seed.as_str() {
        "SHADOW-CH01-KUL" => 0,
        "SHADOW-CH02-KASA" => 1,
        "SHADOW-CH03-VIP" => 2,
        "SHADOW-CH04-SES" => 3,
        "SHADOW-CH05-MIMAR" => 5,
        _ => rng.gen_range(0..VENUES.len()),
    };
    let venue = &VENUES[venue_index];
    let weather_choices = ["rain", "blackout", "fog"];
    let scene_weather = weather_choices[rng.gen_range(0..weather_choices.len())].to_string();

    // Resolution twist: 55% single_culprit, 25% accomplice (dual alibi!), 20% accident_suicide
    let roll = rng.gen_range(0..100);
    let resolution_type = match clean_seed.as_str() {
        "SHADOW-CH01-KUL" | "SHADOW-CH02-KASA" | "SHADOW-CH05-MIMAR" => "single_culprit".to_string(),
        "SHADOW-CH03-VIP" => "accomplice".to_string(),
        _ => {
            if roll < 55 {
                "single_culprit".to_string()
            } else if roll < 80 {
                "accomplice".to_string()
            } else {
                "accident_suicide".to_string()
            }
        }
    };

    let crime = if resolution_type == "accident_suicide" {
        &CRIME_TYPES[3]
    } else if resolution_type == "accomplice" {
        &CRIME_TYPES[5]
    } else {
        &CRIME_TYPES[rng.gen_range(0..CRIME_TYPES.len())]
    };
    let method = &METHODS[rng.gen_range(0..METHODS.len())];
    let victim_name = VICTIM_NAMES[rng.gen_range(0..VICTIM_NAMES.len())];
    let victim_role = venue.victim_roles[rng.gen_range(0..venue.victim_roles.len())];
    let victim_age = rng.gen_range(44..64);

    // Guarantee 5 suspects with 5 strictly unique visual portraits:
    // 3 female suspects -> portraits 0, 2, 4 | 2 male suspects -> portraits 1, 3
    let mut female_pool: Vec<usize> = vec![0, 2, 4, 6, 8];
    let mut male_pool: Vec<usize> = vec![1, 3, 5, 7, 9];
    female_pool.shuffle(&mut rng);
    male_pool.shuffle(&mut rng);
    let mut chosen_pairs: Vec<(usize, usize)> = vec![
        (female_pool[0], 0),
        (male_pool[0], 1),
        (female_pool[1], 2),
        (male_pool[1], 3),
        (female_pool[2], 4),
    ];
    chosen_pairs.shuffle(&mut rng);
    let chosen: Vec<usize> = chosen_pairs.iter().map(|(idx, _)| *idx).collect();
    let assigned_portraits: Vec<usize> = chosen_pairs.iter().map(|(_, p)| *p).collect();

    let killer_slot = rng.gen_range(0..5);
    let mut red_herring_slots: Vec<usize> = (0..5).filter(|&i| i != killer_slot).collect();
    red_herring_slots.shuffle(&mut rng);
    let rh1_slot = red_herring_slots[0];
    let rh2_slot = red_herring_slots[1];
    let witness_slot = red_herring_slots[2];

    let killer_hand = if rng.gen_bool(0.5) { "Solak" } else { "Sağlak" };
    let other_hand = if killer_hand == "Solak" { "Sağlak" } else { "Solak" };

    let action_min: u32 = rng.gen_range(150..205);
    let death_min: u32 = action_min + method.onset_delay_min;
    let death_win_start = (death_min / 15) * 15;
    let death_win_end = death_win_start + 30;
    let found_min = death_min + rng.gen_range(75..120);

    let hours_elapsed = (found_min - death_min) as f32 / 60.0;
    let body_temp_c = ((37.2 - hours_elapsed * 0.95) * 10.0).round() / 10.0;
    let ambient_temp_c = 21.0;

    let pin_year = rng.gen_range(1974..1996);
    let phone_pin = format!("{}", pin_year);
    let safe_combo: [u8; 3] = [
        rng.gen_range(12..48),
        rng.gen_range(50..85),
        rng.gen_range(10..40),
    ];

    let pin_hint = format!(
        "Kurbanın masasında çerçeveli bir diploma/not var: '{} — Kuruluş / Doğum Yılı: {}' ibaresinin altı çizilmiş, yanında 'PIN değişmedi' yazıyor. Arka yüzünde ise kasa kadranı için 3 sayı not düşülmüş: {}-{}-{}.",
        victim_name, pin_year, safe_combo[0], safe_combo[1], safe_combo[2]
    );

    let motive = &MOTIVES[rng.gen_range(0..MOTIVES.len())];
    let ds1 = &DIRTY_SECRETS[rng.gen_range(0..2)];
    let ds2 = &DIRTY_SECRETS[rng.gen_range(2..4)];

    let rooms: Vec<RoomRect> = venue
        .rooms
        .iter()
        .map(|(id, name, x, y, w, h, cam, ang)| RoomRect {
            id: id.to_string(),
            name: name.to_string(),
            x: *x,
            y: *y,
            w: *w,
            h: *h,
            has_camera: *cam,
            camera_angle: *ang,
        })
        .collect();

    let mut suspect_ids = Vec::new();
    let mut suspect_names = Vec::new();
    let mut suspect_hands = Vec::new();
    for i in 0..5 {
        let (name, _, _, _, _, _) = SUSPECT_POOL[chosen[i]];
        suspect_ids.push(format!("s{}", i + 1));
        suspect_names.push(name.to_string());
        let hand = if i == killer_slot || i == rh1_slot {
            killer_hand
        } else {
            other_hand
        };
        suspect_hands.push(hand.to_string());
    }

    let killer_id = suspect_ids[killer_slot].clone();
    let killer_name = suspect_names[killer_slot].clone();
    let rh1_id = suspect_ids[rh1_slot].clone();
    let rh1_name = suspect_names[rh1_slot].clone();
    let rh2_id = suspect_ids[rh2_slot].clone();
    let rh2_name = suspect_names[rh2_slot].clone();
    let witness_name = suspect_names[witness_slot].clone();

    let action_time_str = format_min(action_min);
    let death_time_str = format_min(death_min);
    let found_time_str = format_min(found_min);
    let rh1_time_str = format_min(action_min.saturating_sub(35));
    let rh2_time_str = format_min(action_min + 40);

    let ev_autopsy_id = "ev_autopsy".to_string();
    let ev_uv_method_id = "ev_uv_method".to_string();
    let ev_killer_alibi_id = "ev_triangulation".to_string();
    let ev_motive_id = "ev_phone_motive".to_string();
    let ev_rh1_cam_id = "ev_rh1_cam".to_string();
    let ev_rh2_log_id = "ev_rh2_log".to_string();
    let ev_pin_clue_id = "ev_pin_clue".to_string();
    let ev_phone_sms_id = "ev_phone_sms".to_string();
    let ev_act2_lab_id = "ev_act2_lab".to_string();
    let ev_audio_id = "ev_audio_clean".to_string();
    let ev_chem_id = "ev_chem_match".to_string();
    let ev_safe_id = "ev_safe_doc".to_string();

    let method_detail_with_hand = if method.requires_handedness {
        format!(
            "{} Adli vektör analizi failin kesinlikle {} olduğunu ortaya koyuyor.",
            method.uv_trace_detail, killer_hand
        )
    } else {
        method.uv_trace_detail.to_string()
    };

    let evidence = vec![
        EvidenceItem {
            id: ev_autopsy_id.clone(),
            code: "ADL-01".to_string(),
            title: format!("Ön Otopsi: {}", method.name),
            category: "forensic".to_string(),
            summary: format!("Bulunma: {} | Vücut ısısı: {}°C", found_time_str, body_temp_c),
            detail: format!(
                "{} Kurban {} saat {} civarında bulundu. Ölüm penceresini Adli Tıp Hesaplayıcı ile kesinleştir.",
                method.forensic_notes, victim_name, found_time_str
            ),
            timestamp: Some(found_time_str.clone()),
            suspect_id: None,
            unlocked_by_default: true,
            unlock_source: "initial".to_string(),
            is_uv_trace: false,
        },
        EvidenceItem {
            id: ev_pin_clue_id.clone(),
            code: "OLY-02".to_string(),
            title: "Kurbanın Masasındaki Not & Çerçeve".to_string(),
            category: "physical".to_string(),
            summary: "Telefon PIN'i ve kasa kadran kombinasyonu ipucu içeriyor.".to_string(),
            detail: pin_hint.clone(),
            timestamp: None,
            suspect_id: None,
            unlocked_by_default: false,
            unlock_source: "scene".to_string(),
            is_uv_trace: false,
        },
        EvidenceItem {
            id: ev_uv_method_id.clone(),
            code: "UV-03".to_string(),
            title: method.uv_trace_title.to_string(),
            category: "forensic".to_string(),
            summary: if method.requires_handedness {
                format!("Kritik UV adli izi — Failin {} olduğunu kanıtlıyor.", killer_hand)
            } else {
                format!("Kritik UV adli izi — {} mekanizmasını doğruluyor.", method.name)
            },
            detail: method_detail_with_hand,
            timestamp: Some(action_time_str.clone()),
            suspect_id: Some(killer_id.clone()),
            unlocked_by_default: false,
            unlock_source: "scene".to_string(),
            is_uv_trace: true,
        },
        EvidenceItem {
            id: ev_rh1_cam_id.clone(),
            code: "CCTV-04".to_string(),
            title: format!("Koridor Kamerası — {}", rh1_time_str),
            category: "digital".to_string(),
            summary: format!("{} saat {}'de {} önünde görüntülendi.", rh1_name, rh1_time_str, rooms[1].name),
            detail: format!(
                "CCTV-02 kaydı: {} saat {}'de telaşlı şekilde {} kapısını yokluyor, 2 dakika sonra uzaklaşıyor. Ancak bu an asıl olay saatinden önce.",
                rh1_name, rh1_time_str, rooms[1].name
            ),
            timestamp: Some(rh1_time_str.clone()),
            suspect_id: Some(rh1_id.clone()),
            unlocked_by_default: false,
            unlock_source: "scene".to_string(),
            is_uv_trace: false,
        },
        EvidenceItem {
            id: ev_rh2_log_id.clone(),
            code: "LOG-05".to_string(),
            title: format!("Elektronik Kart Geçişi — {}", rh2_time_str),
            category: "digital".to_string(),
            summary: format!("{} kartı {}'de {} kapısında okutuldu.", rh2_name, rh2_time_str, rooms[4].name),
            detail: format!(
                "Erişim logu: {} adına kayıtlı manyetik kart saat {}'de {} kapısını açtı. Şüpheli ifadesinde binadan erken ayrıldığını iddia etmişti.",
                rh2_name, rh2_time_str, rooms[4].name
            ),
            timestamp: Some(rh2_time_str.clone()),
            suspect_id: Some(rh2_id.clone()),
            unlocked_by_default: false,
            unlock_source: "scene".to_string(),
            is_uv_trace: false,
        },
        EvidenceItem {
            id: ev_killer_alibi_id.clone(),
            code: "HTS-06".to_string(),
            title: format!("HTS Baz Üçgenleme — {}", action_time_str),
            category: "digital".to_string(),
            summary: format!("{} telefonu {}'de olay yeri baz istasyonunda saptandı!", killer_name, action_time_str),
            detail: format!(
                "3 baz istasyonu kesişimi kesin: {} adlı şüphelinin telefonu saat {}'de iddia ettiği uzak semtte değil, doğrudan {} binasının 50 metre çapındaydı.",
                killer_name, action_time_str, venue.name
            ),
            timestamp: Some(action_time_str.clone()),
            suspect_id: Some(killer_id.clone()),
            unlocked_by_default: false,
            unlock_source: "triangulation".to_string(),
            is_uv_trace: false,
        },
        EvidenceItem {
            id: ev_motive_id.clone(),
            code: "TEL-07".to_string(),
            title: format!("Silinmiş Dosya: {}", motive.0),
            category: "secret".to_string(),
            summary: format!("{} ile kurban arasındaki ölümcül çıkar çatışması.", killer_name),
            detail: format!(
                "Kurbanın kilitli telefonundan kurtarılan belge: {} Bu dosya sabah savcılığa/basına verilecekti. Hedef alınan isim doğrudan {}.",
                motive.1, killer_name
            ),
            timestamp: Some(format_min(action_min.saturating_sub(20))),
            suspect_id: Some(killer_id.clone()),
            unlocked_by_default: false,
            unlock_source: "phone".to_string(),
            is_uv_trace: false,
        },
        EvidenceItem {
            id: ev_phone_sms_id.clone(),
            code: "TEL-08".to_string(),
            title: "Kurtarılan Son SMS Trafiği".to_string(),
            category: "digital".to_string(),
            summary: format!("Saat {}'de kurban 'Buluşalım, bu iş bu gece bitecek' yazmış.", format_min(action_min.saturating_sub(15))),
            detail: format!(
                "Kurban {} saat {}'de şifreli sohbetten '{}' ile buluşma teyidi yapmış. Mesaj hemen ardından karşı taraftan silinmeye çalışılmış.",
                victim_name,
                format_min(action_min.saturating_sub(15)),
                killer_name
            ),
            timestamp: Some(format_min(action_min.saturating_sub(15))),
            suspect_id: Some(killer_id.clone()),
            unlocked_by_default: false,
            unlock_source: "phone".to_string(),
            is_uv_trace: false,
        },
        EvidenceItem {
            id: ev_act2_lab_id.clone(),
            code: "LAB-09".to_string(),
            title: "ACT II Ek Laboratuvar & DNA/Lif Raporu".to_string(),
            category: "forensic".to_string(),
            summary: format!("Olay yeri mikro-lif analizi {} ile {} arasında kesin ayrım getirdi.", rh1_name, killer_name),
            detail: format!(
                "Gecikmeli laboratuvar sonucu: {} üzerindeki izler sadece {} bölgesine ait, olay odasıyla teması YOK. Olay odasındaki mikro-lifler {} ({}) profiliyle eşleşiyor.",
                rh1_name, rooms[1].name, killer_name, killer_hand
            ),
            timestamp: Some(death_time_str.clone()),
            suspect_id: Some(killer_id.clone()),
            unlocked_by_default: false,
            unlock_source: "act2".to_string(),
            is_uv_trace: false,
        },
        EvidenceItem {
            id: ev_audio_id.clone(),
            code: "SES-10".to_string(),
            title: "Temizlenen Gece Telsiz / Ortam Kaydı".to_string(),
            category: "digital".to_string(),
            summary: format!("Saat {} kaydında '{}' sesi ve kapı sürgüsü duyuluyor.", action_time_str, killer_name),
            detail: format!(
                "Parazit filtresinden geçirilen ortam kaydı: \"...bu dosyayı sabah veremeyeceksin {}...\" — Ses spektrumu {} ile %94 örtüşüyor.",
                victim_name, killer_name
            ),
            timestamp: Some(action_time_str.clone()),
            suspect_id: Some(killer_id.clone()),
            unlocked_by_default: false,
            unlock_source: "audio".to_string(),
            is_uv_trace: false,
        },
        EvidenceItem {
            id: ev_chem_id.clone(),
            code: "KİM-11".to_string(),
            title: "Adli Kimya Spektrum Eşleşmesi".to_string(),
            category: "forensic".to_string(),
            summary: format!("Olay yeri numunesi '{}' mekanizmasını doğruladı.", method.name),
            detail: format!(
                "Spektrometre analizi tamamlandı: Olay yerinden alınan numune '{}' profiliyle birebir eşleşti.",
                method.name
            ),
            timestamp: Some(action_time_str.clone()),
            suspect_id: None,
            unlocked_by_default: false,
            unlock_source: "chem".to_string(),
            is_uv_trace: false,
        },
        EvidenceItem {
            id: ev_safe_id.clone(),
            code: "KAS-12".to_string(),
            title: "Kilitli Kasa Gizli Dosyası".to_string(),
            category: "secret".to_string(),
            summary: format!("Kasa içinden {} aleyhine ıslak imzalı belge çıktı.", killer_name),
            detail: format!(
                "Kasa kombinasyonu kırıldı: İçeride {} hakkındaki '{}' dosyasının orijinal kopyası ve tehdit notları bulundu.",
                killer_name, motive.0
            ),
            timestamp: None,
            suspect_id: Some(killer_id.clone()),
            unlocked_by_default: false,
            unlock_source: "safe".to_string(),
            is_uv_trace: false,
        },
    ];

    let hotspots = vec![
        SceneHotspot {
            id: "hs1".to_string(),
            room_id: "r1".to_string(),
            label: "Çalışma Masası & Çerçeve (Çevir)".to_string(),
            x: 24.0,
            y: 52.0,
            uv_only: false,
            evidence_id: ev_pin_clue_id.clone(),
            inspect_text: "Kurbanın çalışma masasında çerçeveli diploma buldun — arka yüzüne çevirip el yazısını oku!".to_string(),
            inspect_kind: "frame_flip".to_string(),
        },
        SceneHotspot {
            id: "hs2".to_string(),
            room_id: "r1".to_string(),
            label: "UV 365nm Adli Kalıntı".to_string(),
            x: 68.0,
            y: 66.0,
            uv_only: true,
            evidence_id: ev_uv_method_id.clone(),
            inspect_text: format!("UV 365nm altında çıplak gözle görünmeyen kritik iz parladı: {}", method.uv_trace_title),
            inspect_kind: "uv_macro".to_string(),
        },
        SceneHotspot {
            id: "hs3".to_string(),
            room_id: "r3".to_string(),
            label: "Yırtık Not & Koridor CCTV".to_string(),
            x: 48.0,
            y: 28.0,
            uv_only: false,
            evidence_id: ev_rh1_cam_id.clone(),
            inspect_text: format!("Koridor kamerasının gece {} kaydı ve yanında 3 parçaya yırtılmış bir not bulundu.", rh1_time_str),
            inspect_kind: "torn_note".to_string(),
        },
        SceneHotspot {
            id: "hs4".to_string(),
            room_id: "r5".to_string(),
            label: "Kart Okuyucu Log Kutusu".to_string(),
            x: 82.0,
            y: 44.0,
            uv_only: false,
            evidence_id: ev_rh2_log_id.clone(),
            inspect_text: format!("{} kapısının manyetik geçiş loglarını çektin. (LOG-05)", rooms[4].name),
            inspect_kind: "terminal".to_string(),
        },
    ];

    let torn_full = if resolution_type == "accomplice" {
        format!("Saat {}'de {} kapıyı oyalayacak, {} içeri girecek. İkimiz de birbirimize şahitlik edeceğiz.", action_time_str, rh1_name, killer_name)
    } else if resolution_type == "accident_suicide" {
        format!("Artık bu baskıya dayanamıyorum — kimseyi suçlamayın, {} saatinde her şeyi kendi elimle bitiriyorum. — {}", action_time_str, victim_name)
    } else {
        format!("{} hakkındaki {} belgesini yarın 09:00'da savcılığa veriyorum. Geri dönüş yok.", killer_name, motive.0)
    };
    let inspectable_props = InspectableProps {
        frame_front_title: format!("{} — ONUR BELGESİ", victim_name.to_uppercase()),
        frame_front_subtitle: format!("{} • Kuruluş / Doğum: {}", victim_role, pin_year),
        frame_back_handwriting: format!(
            "\"Telefon PIN'i değişmedi ({}).\nKasa kadranı: {} — {} — {}\nKimseye güvenme.\"",
            pin_year, safe_combo[0], safe_combo[1], safe_combo[2]
        ),
        torn_note_fragments: vec![
            torn_full.chars().take(torn_full.chars().count() / 3).collect(),
            torn_full.chars().skip(torn_full.chars().count() / 3).take(torn_full.chars().count() / 3).collect(),
            torn_full.chars().skip((torn_full.chars().count() / 3) * 2).collect(),
        ],
        torn_note_full: torn_full,
    };

    let mut suspects = Vec::new();
    let mut suspect_truths = Vec::new();
    let mut timeline = Vec::new();

    for i in 0..5 {
        let p_idx = chosen[i];
        let portrait_asset_idx = assigned_portraits[i];
        let (name, role, age, blood, archetype, accent) = SUSPECT_POOL[p_idx];
        let sid = suspect_ids[i].clone();
        let hand = suspect_hands[i].clone();

        if i == killer_slot {
            let claim_loc = "Evde / Uzak Semtte".to_string();
            let st1 = Statement {
                id: format!("{}_st1", sid),
                act: 1,
                text: format!(
                    "Saat {} civarında binadan çoktan çıkmıştım, evimde yalnızdım. {} ile o gece hiç görüşmedim.",
                    format_min(action_min.saturating_sub(25)),
                    victim_name
                ),
                press_reply: "Telefonum şarja takılıydı, kimseyle konuşmadım. İstediğiniz yere bakın, o saatte binanın yakınında bile değildim.".to_string(),
                is_lie: true,
                contradicted_by: Some(ev_killer_alibi_id.clone()),
                break_reply: Some(format!(
                    "Lanet olsun... Tamam, saat {}'de binanın çevresindeydim! Sadece bir dosya bırakıp çıktım, odaya girmedim!",
                    action_time_str
                )),
                reveals_secret: Some(format!("{} saat {}'de olay yerinde olduğunu kabul etmek zorunda kaldı.", name, action_time_str)),
            };
            let st2 = Statement {
                id: format!("{}_st2", sid),
                act: 1,
                text: format!(
                    "{} ile aramızda hiçbir husumet yoktu. Bana karşı herhangi bir belge veya şikâyeti olduğuna dair tek bir kanıt bulamazsınız.",
                    victim_name
                ),
                press_reply: "Profesyonel bir ilişkimiz vardı. Neden ona zarar vereyim ki? Asıl diğerlerinin karanlık işlerine bakın.".to_string(),
                is_lie: true,
                contradicted_by: Some(ev_motive_id.clone()),
                break_reply: Some(format!(
                    "O dosyayı nereden buldunuz?! {} beni bitirmekle tehdit ediyordu, konuşmak için gittim ama... her şey kontrolden çıktı!",
                    victim_name
                )),
                reveals_secret: Some(format!("{} motivasyonunu ({}) inkâr edemez hale geldi.", name, motive.0)),
            };
            let st3 = Statement {
                id: format!("{}_st3", sid),
                act: 2,
                text: format!(
                    "Olay yerindeki adli izlerle benim hiçbir bağlantım yok. {} odaya benden önce girmişti, suçu bana yıkamazsınız!",
                    rh1_name
                ),
                press_reply: "Laboratuvar raporları kesin konuşmadan beni suçlayamazsınız. Elimde hiçbir iz yok!".to_string(),
                is_lie: true,
                contradicted_by: Some(ev_uv_method_id.clone()),
                break_reply: Some("...Avukatım gelmeden tek kelime daha etmeyeceğim. Bu görüşme bitti.".to_string()),
                reveals_secret: Some(format!("{} adli UV kanıtı karşısında tamamen köşeye sıkıştı.", name)),
            };

            let follow_ups = vec![
                FollowUpQuestion {
                    id: format!("{}_fq1", sid),
                    question: format!("{} hakkında ne düşünüyorsun?", rh1_name),
                    answer: format!("{} son haftalarda sürekli gergindi. Gece koridorda dolaşacak biri varsa kesin odur.", rh1_name),
                    pulse_bump: 6,
                },
                FollowUpQuestion {
                    id: format!("{}_fq2", sid),
                    question: "Kurbanın telefonundaki son silinen mesajlar hakkında bilgin var mı?".to_string(),
                    answer: "Ben nereden bileyim? Kendi özel işleri beni ilgilendirmez... konuyu saptırıyorsunuz.".to_string(),
                    pulse_bump: 14,
                },
            ];

            suspects.push(Suspect {
                id: sid.clone(),
                portrait_index: portrait_asset_idx,
                name: name.to_string(),
                role: role.to_string(),
                age,
                handedness: hand.clone(),
                blood_type: blood.to_string(),
                archetype_tag: archetype.to_string(),
                portrait_accent: accent.to_string(),
                base_pulse: 74,
                alibi_summary: format!("{} sonrası {} olduğunu iddia ediyor.", format_min(action_min.saturating_sub(25)), claim_loc),
                statements: vec![st1, st2, st3],
                follow_ups,
            });

            timeline.push(TimelineEntry {
                suspect_id: sid.clone(),
                start_min: action_min.saturating_sub(30),
                end_min: found_min,
                location: claim_loc,
                is_claimed: true,
                evidence_id: None,
            });
            timeline.push(TimelineEntry {
                suspect_id: sid.clone(),
                start_min: action_min.saturating_sub(10),
                end_min: action_min + 20,
                location: format!("{} (HTS Kesin)", venue.name),
                is_claimed: false,
                evidence_id: Some(ev_killer_alibi_id.clone()),
            });

            suspect_truths.push(SuspectTruth {
                suspect_id: sid,
                is_killer: resolution_type != "accident_suicide",
                is_accomplice: false,
                personality: archetype.to_string(),
                real_actions: format!(
                    "Saat {}'de {} ile {} içinde buluştu ({}).",
                    action_time_str, victim_name, rooms[0].name, hand
                ),
                active_lie: format!("Saat {}'de binada değil evde olduğunu iddia ediyor.", action_time_str),
                hidden_secret: if resolution_type == "accident_suicide" {
                    "Kurbanla son kez tartıştı ama öldürmedi — olay gerçek bir kaza/intihar.".to_string()
                } else {
                    format!("Gerçek fail. Motivasyonu: {}", motive.0)
                },
            });
        } else if i == rh1_slot {
            let st1 = Statement {
                id: format!("{}_st1", sid),
                act: 1,
                text: format!(
                    "Tüm akşam {} içindeydim, koridora ya da {} tarafına hiç adım atmadım.",
                    rooms[3].name, rooms[1].name
                ),
                press_reply: "Yemin ederim yerimden kalkmadım. Neden kalkayım ki, o saatte işim yoktu.".to_string(),
                is_lie: true,
                contradicted_by: Some(ev_rh1_cam_id.clone()),
                break_reply: Some(format!("{} Ayrıca çıkarken {} koridorun ucunda aceleyle yürüyordu!", ds1.1, killer_name)),
                reveals_secret: Some(format!("{} masum ama gizli sırrı ortaya çıktı: {}", name, ds1.0)),
            };
            let st2 = Statement {
                id: format!("{}_st2", sid),
                act: 2,
                text: format!(
                    "Bana inanmıyorsanız laboratuvara bakın; {} odasına hiç girmedim, sadece {} önündeydim.",
                    rooms[0].name, rooms[1].name
                ),
                press_reply: "Hata yaptım ama fail ben değilim. Asıl kurbanın telefonundaki son mesajlara ve ses kaydına bakın.".to_string(),
                is_lie: false,
                contradicted_by: None,
                break_reply: None,
                reveals_secret: None,
            };

            let follow_ups = vec![
                FollowUpQuestion {
                    id: format!("{}_fq1", sid),
                    question: "O gece koridorda başka kimi gördün?".to_string(),
                    answer: format!("Tam emin değilim ama saat {}'ye doğru {} tarafında telaşlı ayak sesleri duydum.", action_time_str, rooms[0].name),
                    pulse_bump: 9,
                },
            ];

            suspects.push(Suspect {
                id: sid.clone(),
                portrait_index: portrait_asset_idx,
                name: name.to_string(),
                role: role.to_string(),
                age,
                handedness: hand.clone(),
                blood_type: blood.to_string(),
                archetype_tag: archetype.to_string(),
                portrait_accent: accent.to_string(),
                base_pulse: 82,
                alibi_summary: format!("Bütün gece {} alanında kaldığını söylüyor.", rooms[3].name),
                statements: vec![st1, st2],
                follow_ups,
            });

            timeline.push(TimelineEntry {
                suspect_id: sid.clone(),
                start_min: action_min.saturating_sub(60),
                end_min: found_min,
                location: rooms[3].name.clone(),
                is_claimed: true,
                evidence_id: None,
            });
            timeline.push(TimelineEntry {
                suspect_id: sid.clone(),
                start_min: action_min.saturating_sub(40),
                end_min: action_min.saturating_sub(25),
                location: format!("{} (CCTV)", rooms[1].name),
                is_claimed: false,
                evidence_id: Some(ev_rh1_cam_id.clone()),
            });

            suspect_truths.push(SuspectTruth {
                suspect_id: sid,
                is_killer: false,
                is_accomplice: resolution_type == "accomplice",
                personality: archetype.to_string(),
                real_actions: format!("Saat {}'de {} önünde görüldü. {}", rh1_time_str, rooms[1].name, ds1.2),
                active_lie: if resolution_type == "accomplice" {
                    format!("{} ile birlikte olduğunu iddia ederek ortak alibi kuruyor.", killer_name)
                } else {
                    "Koridora hiç çıkmadığını söylüyor.".to_string()
                },
                hidden_secret: if resolution_type == "accomplice" {
                    format!("İŞBİRLİKÇİ! {} için kamerayı oyalayıp sahte ikili alibi verdi.", killer_name)
                } else {
                    format!("MASUM — ama kirli sırrı var: {}. Çıkarken {} adlı kişiyi koridorda gördü.", ds1.0, killer_name)
                },
            });
        } else if i == rh2_slot {
            let st1 = Statement {
                id: format!("{}_st1", sid),
                act: 1,
                text: format!(
                    "Saat {} gibi işimi bitirip çıktım. {} kapısından o gece kesinlikle geçmedim.",
                    format_min(action_min.saturating_sub(45)),
                    rooms[4].name
                ),
                press_reply: "Kartım cebimdeydi, kimseye vermedim. Geç saatte orada olmam için hiçbir sebep yok.".to_string(),
                is_lie: true,
                contradicted_by: Some(ev_rh2_log_id.clone()),
                break_reply: Some(format!("{} Ama {} saat {} civarında hâlâ binadaydı, sesini duydum!", ds2.1, killer_name, action_time_str)),
                reveals_secret: Some(format!("{} masum ama gizli sırrı patladı: {}", name, ds2.0)),
            };

            let follow_ups = vec![
                FollowUpQuestion {
                    id: format!("{}_fq1", sid),
                    question: "Kart loglarında senin adın neden geçiyor olabilir?".to_string(),
                    answer: "Sistem arızasıdır! Gece geç saatte geri dönmem için hiçbir nedenim yok... en azından cinayetle ilgili değil.".to_string(),
                    pulse_bump: 12,
                },
            ];

            suspects.push(Suspect {
                id: sid.clone(),
                portrait_index: portrait_asset_idx,
                name: name.to_string(),
                role: role.to_string(),
                age,
                handedness: hand.clone(),
                blood_type: blood.to_string(),
                archetype_tag: archetype.to_string(),
                portrait_accent: accent.to_string(),
                base_pulse: 79,
                alibi_summary: format!("Saat {}'de binadan ayrıldığını iddia ediyor.", format_min(action_min.saturating_sub(45))),
                statements: vec![st1],
                follow_ups,
            });

            timeline.push(TimelineEntry {
                suspect_id: sid.clone(),
                start_min: action_min.saturating_sub(50),
                end_min: found_min,
                location: "Bina Dışı (İddia)".to_string(),
                is_claimed: true,
                evidence_id: None,
            });
            timeline.push(TimelineEntry {
                suspect_id: sid.clone(),
                start_min: action_min + 35,
                end_min: action_min + 50,
                location: format!("{} (Kart Logu)", rooms[4].name),
                is_claimed: false,
                evidence_id: Some(ev_rh2_log_id.clone()),
            });

            suspect_truths.push(SuspectTruth {
                suspect_id: sid,
                is_killer: false,
                is_accomplice: false,
                personality: archetype.to_string(),
                real_actions: format!("Saat {}'de {} kapısında kart okuttu. {}", rh2_time_str, rooms[4].name, ds2.2),
                active_lie: "Erken çıktığını söylüyor.".to_string(),
                hidden_secret: format!("MASUM — ama kirli sırrı var: {}.", ds2.0),
            });
        } else if i == witness_slot {
            let st1 = Statement {
                id: format!("{}_st1", sid),
                act: 1,
                text: format!(
                    "{} o akşam çok gergindi. 'Sabah her şey bitecek, telefonumdaki dosyayı savcılığa vereceğim' dedi.",
                    victim_name
                ),
                press_reply: "Telefon şifresini hep çalışma masasındaki çerçevedeki yıla göre koyardı, kasa kombinasyonunu da arkasına not etmişti.".to_string(),
                is_lie: false,
                contradicted_by: None,
                break_reply: None,
                reveals_secret: None,
            };
            let follow_ups = vec![
                FollowUpQuestion {
                    id: format!("{}_fq1", sid),
                    question: "Kurban en çok kimden çekiniyordu?".to_string(),
                    answer: format!("İsim vermedi ama {} ile son iki gündür çok sert telefon görüşmeleri yapıyordu.", killer_name),
                    pulse_bump: 4,
                },
            ];
            suspects.push(Suspect {
                id: sid.clone(),
                portrait_index: portrait_asset_idx,
                name: name.to_string(),
                role: role.to_string(),
                age,
                handedness: hand.clone(),
                blood_type: blood.to_string(),
                archetype_tag: archetype.to_string(),
                portrait_accent: accent.to_string(),
                base_pulse: 68,
                alibi_summary: format!("{} boyunca güvenlik kayıtlı ortak alanda.", format_min(action_min)),
                statements: vec![st1],
                follow_ups,
            });
            timeline.push(TimelineEntry {
                suspect_id: sid.clone(),
                start_min: action_min.saturating_sub(40),
                end_min: found_min,
                location: "Ortak Alan (Doğrulandı)".to_string(),
                is_claimed: false,
                evidence_id: None,
            });
            suspect_truths.push(SuspectTruth {
                suspect_id: sid,
                is_killer: false,
                is_accomplice: false,
                personality: archetype.to_string(),
                real_actions: "Ortak alanda nöbetteydi, kurbanın son gerginliğine şahit oldu.".to_string(),
                active_lie: "Yalan söylemiyor.".to_string(),
                hidden_secret: "Kurbanın telefon PIN'inin ve kasa kombinasyonunun çerçevede gizli olduğunu biliyor.".to_string(),
            });
        } else {
            let st1 = Statement {
                id: format!("{}_st1", sid),
                act: 1,
                text: format!(
                    "Saat {} civarında {} kapısının önünde telaşlı bir gölge gördüm ama yüzünü seçemedim. Sadece çok hızlı yürüyordu.",
                    action_time_str, rooms[0].name
                ),
                press_reply: format!("O kişi {} gibi soğukkanlı görünüyordu; cep telefonu ekranı karanlıkta parladı, kesin baz istasyonuna düşmüştür.", killer_name),
                is_lie: false,
                contradicted_by: None,
                break_reply: None,
                reveals_secret: None,
            };
            let follow_ups = vec![
                FollowUpQuestion {
                    id: format!("{}_fq1", sid),
                    question: "Telsiz veya garip bir ses duydun mu?".to_string(),
                    answer: format!("Evet, saat {} civarında güvenlik telsiz kanalında boğuk bir tartışma sesi karıştı. Frekans temizlenirse net duyulur.", action_time_str),
                    pulse_bump: 3,
                },
            ];
            suspects.push(Suspect {
                id: sid.clone(),
                portrait_index: portrait_asset_idx,
                name: name.to_string(),
                role: role.to_string(),
                age,
                handedness: hand.clone(),
                blood_type: blood.to_string(),
                archetype_tag: archetype.to_string(),
                portrait_accent: accent.to_string(),
                base_pulse: 70,
                alibi_summary: "Diğer kanatta tanıklarla birlikteydi (doğrulandı).".to_string(),
                statements: vec![st1],
                follow_ups,
            });
            timeline.push(TimelineEntry {
                suspect_id: sid.clone(),
                start_min: action_min.saturating_sub(30),
                end_min: found_min,
                location: "Diğer Kanat (Doğrulandı)".to_string(),
                is_claimed: false,
                evidence_id: None,
            });
            suspect_truths.push(SuspectTruth {
                suspect_id: sid,
                is_killer: false,
                is_accomplice: false,
                personality: archetype.to_string(),
                real_actions: "Diğer kanatta tanıklarla birlikteydi.".to_string(),
                active_lie: "Yalan söylemiyor.".to_string(),
                hidden_secret: "Koridorda telefon ışığı ve telsiz paraziti fark etti.".to_string(),
            });
        }
    }

    // Triangulation
    let tx: f32 = rng.gen_range(28..72) as f32;
    let ty: f32 = rng.gen_range(28..72) as f32;
    let towers = vec![
        CellTower {
            id: "t1".to_string(),
            name: "BAZ-K1 (Kuzey)".to_string(),
            x: (tx - 18.0).max(10.0),
            y: (ty - 16.0).max(10.0),
            radius: ((18.0_f32).powi(2) + (16.0_f32).powi(2)).sqrt(),
        },
        CellTower {
            id: "t2".to_string(),
            name: "BAZ-D4 (Doğu)".to_string(),
            x: (tx + 22.0).min(90.0),
            y: (ty - 8.0).max(10.0),
            radius: ((22.0_f32).powi(2) + (8.0_f32).powi(2)).sqrt(),
        },
        CellTower {
            id: "t3".to_string(),
            name: "BAZ-G7 (Güney)".to_string(),
            x: (tx - 6.0).max(10.0),
            y: (ty + 21.0).min(90.0),
            radius: ((6.0_f32).powi(2) + (21.0_f32).powi(2)).sqrt(),
        },
    ];

    // New Puzzles: Audio, CCTV, Chem, Safe, Body Map
    let audio_puzzle = AudioPuzzle {
        channel_name: "KANAL-04 // GECE GÜVENLİK TELSİZİ".to_string(),
        recorded_at: action_time_str.clone(),
        target_freq: rng.gen_range(28..78),
        target_threshold: rng.gen_range(30..75),
        clean_transcript: format!(
            "\"...{} bu dosyayı sabah savcılığa veremeyeceksin! ... [boğuşma ve kapı kilidi sesi] ...\" — Ses izi {} ile eşleşiyor.",
            victim_name, killer_name
        ),
        unlocked_evidence_id: ev_audio_id.clone(),
    };

    let cctv_puzzle = CctvPuzzle {
        camera_label: format!("CAM-02 // {}", rooms[2].name.to_uppercase()),
        target_frame: rng.gen_range(24..76),
        anomaly_time: rh1_time_str.clone(),
        anomaly_desc: format!(
            "{} saat {} karesinde {} kapısını zorlarken net şekilde yakalandı.",
            rh1_name, rh1_time_str, rooms[1].name
        ),
        unlocked_evidence_id: ev_rh1_cam_id.clone(),
    };

    let compounds = vec![
        ChemCompound {
            id: "c1".to_string(),
            name: "Potasyum Klorür (KCl) Solüsyonu".to_string(),
            bars: vec![82, 34, 65, 91, 28, 54],
            effect: "30 dk gecikmeli kardiyak arrest".to_string(),
        },
        ChemCompound {
            id: "c2".to_string(),
            name: "Sodyum Tiyopental / Sedatif".to_string(),
            bars: vec![40, 88, 52, 30, 79, 44],
            effect: "20 dk içinde solunum depresyonu".to_string(),
        },
        ChemCompound {
            id: "c3".to_string(),
            name: "Karbonmonoksit (CO) İzotopu".to_string(),
            bars: vec![25, 45, 92, 74, 38, 86],
            effect: "15 dk içinde hipoksi & kiraz livor".to_string(),
        },
        ChemCompound {
            id: "c4".to_string(),
            name: "Luminol + Metal Oksit Kalıntısı".to_string(),
            bars: vec![71, 62, 29, 48, 85, 67],
            effect: "Silinmiş kan & künt/kesici metal izi".to_string(),
        },
    ];
    let correct_c_idx = rng.gen_range(0..compounds.len());
    let chem_puzzle = ChemPuzzle {
        sample_label: format!("NUMUNE #{} — {}", clean_seed, rooms[0].name),
        unknown_bars: compounds[correct_c_idx].bars.clone(),
        correct_compound_id: compounds[correct_c_idx].id.clone(),
        compounds,
        unlocked_evidence_id: ev_chem_id.clone(),
    };

    let safe_puzzle = SafePuzzle {
        label: format!("{} DUVAR KASASI", rooms[1].name.to_uppercase()),
        hint_text: "3 haneli kadran kombinasyonu olay yerindeki çalışma masası notunun (OLY-02) arka yüzünde gizli.".to_string(),
        unlocked_evidence_id: ev_safe_id.clone(),
        contents_summary: format!("{} aleyhine ıslak imzalı '{}' belgeleri kurtarıldı.", killer_name, motive.0),
    };

    let body_map_puzzle = BodyMapPuzzle {
        subject_label: format!("{} ({} yaş) — Adli Muayene Diyagramı", victim_name, victim_age),
        zones: vec![
            BodyZone {
                id: "head".to_string(),
                label: "Baş & Boyun".to_string(),
                x: 50.0,
                y: 16.0,
                finding: method.forensic_notes.to_string(),
                critical: true,
            },
            BodyZone {
                id: "chest".to_string(),
                label: "Göğüs & Toksikoloji".to_string(),
                x: 50.0,
                y: 38.0,
                finding: format!(
                    "Çekirdek vücut ısısı {}°C (ortam {}°C). Gecikme süresi: {} dk.",
                    body_temp_c, ambient_temp_c, method.onset_delay_min
                ),
                critical: true,
            },
            BodyZone {
                id: "wrists".to_string(),
                label: "Eller & Önkollar".to_string(),
                x: 26.0,
                y: 52.0,
                finding: format!(
                    "Savunma yarası tespit edilmedi — kurban faili yakınına almış. Baskın temas izi {} profiliyle uyumlu.",
                    killer_hand
                ),
                critical: false,
            },
        ],
        unlocked_evidence_id: ev_autopsy_id.clone(),
    };

    let phone_puzzle = PhonePuzzle {
        owner_name: victim_name.to_string(),
        hint_text: "4 haneli PIN gerekli. İpucunu Olay Yeri'ndeki çalışma masasında (OLY-02) veya tanık ifadelerinde ara.".to_string(),
        pin_length: 4,
        unlocked_evidence_ids: vec![ev_motive_id.clone(), ev_phone_sms_id.clone()],
        messages: vec![
            PhoneMessage {
                sender: witness_name.clone(),
                time: format_min(action_min.saturating_sub(65)),
                text: "Dosyayı gerçekten yarın sabah teslim edecek misin? Dikkatli ol.".to_string(),
                deleted: false,
            },
            PhoneMessage {
                sender: killer_name.clone(),
                time: format_min(action_min.saturating_sub(15)),
                text: format!("Buluşalım, {} meselesini bu gece yüz yüze bitirelim.", motive.0),
                deleted: true,
            },
            PhoneMessage {
                sender: "Avukatlık Bürosu".to_string(),
                time: format_min(action_min.saturating_sub(90)),
                text: format!("{} hakkındaki imzalı evrak sabah 09:00'da savcılığa iletilecek.", killer_name),
                deleted: true,
            },
        ],
    };

    let triangulation_puzzle = TriangulationPuzzle {
        target_suspect_name: killer_name.clone(),
        signal_time: action_time_str.clone(),
        towers,
        target_x: tx,
        target_y: ty,
        tolerance: 8.5,
        location_name: venue.name.to_string(),
        unlocked_evidence_id: ev_killer_alibi_id.clone(),
    };

    let autopsy_puzzle = AutopsyPuzzle {
        body_temp_c,
        ambient_temp_c,
        found_time_str: found_time_str.clone(),
        rigor_stage: "Çene ve boyun kaslarında başlangıç düzeyinde rigor mortis".to_string(),
        livor_stage: "Sırt bölgesinde basmakla kısmen solan livor mortis".to_string(),
        onset_delay_min: method.onset_delay_min,
        forensic_notes: method.forensic_notes.to_string(),
        true_death_start_min: death_win_start,
        true_death_end_min: death_win_end,
        unlocked_evidence_id: ev_autopsy_id.clone(),
    };

    let hints = vec![
        "1. İpucu: Olay Yeri'nde [U] tuşuyla UV 365nm feneri aç — çıplak gözle görünmeyen kritik adli iz (UV-03) sadece mor ışıkta parlar.".to_string(),
        format!("2. İpucu: Kurbanın masasında bulduğun OLY-02 notu hem telefon PIN'ini hem kasa kombinasyonunu veriyor. Telefonu kırınca gerçek motivasyon (TEL-07) açılır."),
        format!("3. İpucu: {} ve {} kendi kirli sırları yüzünden yalan söylüyor, asıl olay saatindeki HTS üçgenlemesine (HTS-06) odaklan!", rh1_name, rh2_name),
    ];

    let case_file = CaseFile {
        seed: clean_seed.clone(),
        case_code: clean_seed.clone(),
        difficulty: clean_diff,
        max_hints,
        max_reputation,
        time_limit_sec,
        crime_type: crime.0.to_string(),
        crime_badge: crime.1.to_string(),
        scene_weather,
        venue_index,
        title: format!("{} Dosyası", victim_name),
        venue_name: venue.name.to_string(),
        venue_subtitle: venue.subtitle.to_string(),
        date_str: "24 Kasım • Gece Nöbeti".to_string(),
        victim_name: victim_name.to_string(),
        victim_role: victim_role.to_string(),
        victim_age,
        briefing: format!(
            "[{}] {} ({}, {} yaş) saat {} civarında {} içinde {}. İlk bakışta 5 şüphelinin de alibisi sağlam — ancak bu gece birden fazla kişi yalan söylüyor. Dikkat: İşbirlikçiler veya kaza/intihar sürprizleri mümkün!",
            crime.0, victim_name, victim_role, victim_age, found_time_str, rooms[0].name, crime.2
        ),
        inspectable_props,
        rooms: rooms.clone(),
        hotspots,
        suspects,
        evidence,
        timeline,
        phone_puzzle,
        triangulation_puzzle,
        autopsy_puzzle,
        audio_puzzle,
        cctv_puzzle,
        chem_puzzle,
        safe_puzzle,
        body_map_puzzle,
        hints,
        act2_drop_title: "ACT II — Gecikmeli Laboratuvar & Lif Raporu Düştü".to_string(),
        act2_drop_body: format!(
            "Adli laboratuvar beklenen mikro-lif sonucunu iletti: {} olay odasına hiç girmemiş — koridordaki yalanı kendi kirli sırrı yüzündendi! Yeni ifadeler ve LAB-09 raporu açıldı.",
            rh1_name
        ),
    };

    let chronological_reveal = vec![
        format!("{} — {} kendi kirli sırrı ({}) için {} önünde kameralara yakalandı.", rh1_time_str, rh1_name, ds1.0, rooms[1].name),
        format!("{} — Kurban {} ile {} arasında '{}' yüzünden son mesajlaşma yaşandı.", format_min(action_min.saturating_sub(15)), victim_name, killer_name, motive.0),
        format!("{} — {} evinde olduğunu iddia etse de HTS baz istasyonu onu {} içinde saptadı. {} yöntemiyle olay gerçekleşti.", action_time_str, killer_name, venue.name, method.name),
        format!("{} — Kritik adli zaman penceresi gerçekleşti ({} - {}).", death_time_str, format_min(death_win_start), format_min(death_win_end)),
        format!("{} — {} gizli işi ({}) yüzünden {} kapısında kart okuttu ve panikle yalan söyledi.", rh2_time_str, rh2_name, ds2.0, rooms[4].name),
        format!("{} — Olay tespit edildi ve dosya ({}) açıldı.", found_time_str, clean_seed),
    ];

    let truth = CaseTruth {
        resolution_type: resolution_type.clone(),
        killer_id,
        killer_name,
        accomplice_id: if resolution_type == "accomplice" { Some(rh1_id) } else { None },
        accomplice_name: if resolution_type == "accomplice" { Some(rh1_name) } else { None },
        method_evidence_id: ev_uv_method_id,
        alibi_evidence_id: ev_killer_alibi_id,
        motive_evidence_id: ev_motive_id,
        phone_pin,
        safe_combo,
        motive_summary: format!("{}: {}", motive.0, motive.1),
        method_summary: format!("{} — {}", method.name, method.summary_template),
        chronological_reveal,
        suspect_secrets: suspect_truths,
    };

    (case_file, truth)
}
