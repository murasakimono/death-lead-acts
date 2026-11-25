use crate::generator::generate_case;
use crate::models::*;

pub fn verify_present_evidence(
    seed: &str,
    suspect_id: &str,
    statement_id: &str,
    evidence_id: &str,
) -> PresentResult {
    let (case_file, _) = generate_case(seed, "detective");

    let Some(suspect) = case_file.suspects.iter().find(|s| s.id == suspect_id) else {
        return PresentResult {
            hit: false,
            pulse_delta: 0,
            reply: "Şüpheli bulunamadı.".to_string(),
            revealed_secret: None,
            reputation_delta: 0,
        };
    };

    let Some(st) = suspect.statements.iter().find(|s| s.id == statement_id) else {
        return PresentResult {
            hit: false,
            pulse_delta: 0,
            reply: "İfade bulunamadı.".to_string(),
            revealed_secret: None,
            reputation_delta: 0,
        };
    };

    if st.is_lie && st.contradicted_by.as_deref() == Some(evidence_id) {
        return PresentResult {
            hit: true,
            pulse_delta: 52,
            reply: st
                .break_reply
                .clone()
                .unwrap_or_else(|| "Bunu... bunu nasıl buldunuz?!".to_string()),
            revealed_secret: st.reveals_secret.clone(),
            reputation_delta: 0,
        };
    }

    PresentResult {
        hit: false,
        pulse_delta: -4,
        reply: format!(
            "{}: \"Bu belgenin söylediğimle hiçbir ilgisi yok dedektif. Zamanımı boşa harcıyorsunuz.\"",
            suspect.name
        ),
        revealed_secret: None,
        reputation_delta: -1,
    }
}

pub fn verify_phone_pin(seed: &str, pin: &str) -> PinVerifyResult {
    let (case_file, truth) = generate_case(seed, "detective");
    if pin.trim() == truth.phone_pin {
        PinVerifyResult {
            unlocked: true,
            message: "KİLİT AÇILDI — Silinmiş mesajlar ve gizli dosya kurtarıldı.".to_string(),
            unlocked_evidence_ids: case_file.phone_puzzle.unlocked_evidence_ids,
        }
    } else {
        PinVerifyResult {
            unlocked: false,
            message: "HATALI PIN — Olay yerindeki masa çerçevesi / not ipucunu (OLY-02) kontrol et.".to_string(),
            unlocked_evidence_ids: vec![],
        }
    }
}

pub fn verify_safe_combo(seed: &str, c1: u8, c2: u8, c3: u8) -> PinVerifyResult {
    let (case_file, truth) = generate_case(seed, "detective");
    if [c1, c2, c3] == truth.safe_combo {
        PinVerifyResult {
            unlocked: true,
            message: format!("KASA AÇILDI — {}", case_file.safe_puzzle.contents_summary),
            unlocked_evidence_ids: vec![case_file.safe_puzzle.unlocked_evidence_id],
        }
    } else {
        PinVerifyResult {
            unlocked: false,
            message: "HATALI KOMBİNASYON — OLY-02 notunun arka yüzündeki 3 kadran sayısını kontrol et.".to_string(),
            unlocked_evidence_ids: vec![],
        }
    }
}

pub fn verify_accusation(sub: AccusationSubmission) -> AccusationResult {
    let (case_file, truth) = generate_case(&sub.seed, "detective");

    let find_ev_title = |id: &str| -> String {
        case_file
            .evidence
            .iter()
            .find(|e| e.id == id)
            .map(|e| format!("{} ({})", e.code, e.title))
            .unwrap_or_else(|| id.to_string())
    };

    let c1 = sub.killer_id == truth.killer_id;
    let c2 = sub.method_evidence_id == truth.method_evidence_id
        || sub.method_evidence_id == "ev_act2_lab"
        || sub.method_evidence_id == "ev_chem_match";
    let c3 = sub.alibi_evidence_id == truth.alibi_evidence_id
        || sub.alibi_evidence_id == "ev_audio_clean";
    let c4 = sub.motive_evidence_id == truth.motive_evidence_id
        || sub.motive_evidence_id == "ev_phone_sms"
        || sub.motive_evidence_id == "ev_safe_doc";

    let score = (c1 as u8) + (c2 as u8) + (c3 as u8) + (c4 as u8);
    let solved = score == 4;

    let rank = match score {
        4 => "S — KUSURSUZ ADLİ ÇÖZÜM",
        3 => "A — YAKIN AMA EKSİK KİLİT",
        2 => "B — YARIM DAVA (SAVCILIK İADESİ)",
        _ => "F — DAVA ÇÖKTÜ (FAİL KAÇTI)",
    }
    .to_string();

    AccusationResult {
        solved,
        score,
        rank,
        locks: vec![
            LockCheck {
                label: "1. Kilit — Gerçek Fail".to_string(),
                correct: c1,
                expected_hint: truth.killer_name.clone(),
            },
            LockCheck {
                label: "2. Kilit — Yöntem & Adli Kanıt".to_string(),
                correct: c2,
                expected_hint: find_ev_title(&truth.method_evidence_id),
            },
            LockCheck {
                label: "3. Kilit — Alibi Çökerten Zaman Delili".to_string(),
                correct: c3,
                expected_hint: find_ev_title(&truth.alibi_evidence_id),
            },
            LockCheck {
                label: "4. Kilit — Motivasyon Kanıtı".to_string(),
                correct: c4,
                expected_hint: find_ev_title(&truth.motive_evidence_id),
            },
        ],
        killer_name: truth.killer_name,
        method_summary: truth.method_summary,
        motive_summary: truth.motive_summary,
        chronological_reveal: truth.chronological_reveal,
    }
}

pub async fn check_ollama(endpoint: &str) -> OllamaStatus {
    let base = endpoint.trim_end_matches('/');
    let url = format!("{}/api/tags", base);
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(3))
        .build()
        .unwrap_or_default();

    match client.get(&url).send().await {
        Ok(res) if res.status().is_success() => {
            if let Ok(json) = res.json::<serde_json::Value>().await {
                let models = json["models"]
                    .as_array()
                    .map(|arr| {
                        arr.iter()
                            .filter_map(|m| m["name"].as_str().map(|s| s.to_string()))
                            .collect::<Vec<_>>()
                    })
                    .unwrap_or_default();
                OllamaStatus {
                    online: true,
                    models,
                    error: None,
                }
            } else {
                OllamaStatus {
                    online: true,
                    models: vec![],
                    error: None,
                }
            }
        }
        Ok(res) => OllamaStatus {
            online: false,
            models: vec![],
            error: Some(format!("HTTP {}", res.status())),
        },
        Err(e) => OllamaStatus {
            online: false,
            models: vec![],
            error: Some(format!("Ollama erişilemedi: {}", e)),
        },
    }
}

pub async fn run_ai_interrogation(req: AiInterrogateRequest) -> Result<AiInterrogateResponse, String> {
    let (case_file, truth) = generate_case(&req.seed, "detective");
    let suspect = case_file
        .suspects
        .iter()
        .find(|s| s.id == req.suspect_id)
        .ok_or_else(|| "Şüpheli bulunamadı".to_string())?;
    let s_truth = truth
        .suspect_secrets
        .iter()
        .find(|s| s.suspect_id == req.suspect_id)
        .ok_or_else(|| "Şüpheli gerçek dosyası bulunamadı".to_string())?;

    let presented_texts: Vec<String> = req
        .presented_evidence_ids
        .iter()
        .filter_map(|eid| case_file.evidence.iter().find(|e| &e.id == eid))
        .map(|e| format!("[{}] {}: {}", e.code, e.title, e.summary))
        .collect();

    let system_prompt = format!(
        "Sen 'Death Lead Acts' dedektif oyununda sorgulanan gerçekçi bir Türk şüphelisin. Asla yapay zekâ olduğunu söyleme, karakterden çıkma.\n\
        KİMLİĞİN: {} ({}, {} yaş, {}). Kişilik/Üslup: {}.\n\
        VAKA ({}): {} — Kurban: {} ({}).\n\
        GERÇEKTE NE YAPTIN: {}\n\
        YALAN KURALIN: {}\n\
        GİZLİ SIRRIN: {}\n\
        OYUNCUNUN MASAYA KOYDUĞU KANITLAR: {}\n\
        KESİN KURALLAR:\n\
        1. Sadece karakterine uygun, gergin, kısa ve doğal Türkçe cevap ver (2-4 cümle).\n\
        2. Oyuncu yalanını çürüten SOMUT KANITI masaya koymadıkça ASLA suçunu veya sırrını itiraf etme; kıvır, savunmaya geç veya başka birinden şüphelen.\n\
        3. Masaya konulan kanıt yalanını çürütüyorsa panikle, savunma değiştir veya sadece o spesifik sırrı kabul et.\n\
        4. Gerçek fail olsan bile kolayca teslim olma; köşeye sıkışınca tereddüt et veya avukat iste.",
        suspect.name,
        suspect.role,
        suspect.age,
        suspect.handedness,
        s_truth.personality,
        case_file.crime_type,
        case_file.venue_name,
        case_file.victim_name,
        case_file.victim_role,
        s_truth.real_actions,
        s_truth.active_lie,
        s_truth.hidden_secret,
        if presented_texts.is_empty() {
            "Henüz kanıt sunulmadı.".to_string()
        } else {
            presented_texts.join(" | ")
        }
    );

    let mut messages = vec![serde_json::json!({
        "role": "system",
        "content": system_prompt
    })];

    for h in req.history.iter().rev().take(10).rev() {
        messages.push(serde_json::json!({
            "role": h.role,
            "content": h.content
        }));
    }
    messages.push(serde_json::json!({
        "role": "user",
        "content": req.user_message
    }));

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(45))
        .build()
        .map_err(|e| e.to_string())?;

    let base = req.endpoint_url.trim_end_matches('/');
    let is_openai_style = base.contains("/v1");
    let url = if is_openai_style {
        format!("{}/chat/completions", base)
    } else {
        format!("{}/api/chat", base)
    };

    let mut builder = client.post(&url);
    if let Some(key) = req.api_key.as_ref().filter(|k| !k.trim().is_empty()) {
        builder = builder.bearer_auth(key.trim());
    }

    let payload = if is_openai_style {
        serde_json::json!({
            "model": req.model_name,
            "messages": messages,
            "temperature": 0.7
        })
    } else {
        serde_json::json!({
            "model": req.model_name,
            "messages": messages,
            "stream": false,
            "options": { "temperature": 0.7 }
        })
    };

    let resp = builder
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("AI sunucusuna bağlanılamadı: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("AI sunucu hatası: HTTP {}", resp.status()));
    }

    let body: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    let reply = if is_openai_style {
        body["choices"][0]["message"]["content"]
            .as_str()
            .unwrap_or("...")
            .trim()
            .to_string()
    } else {
        body["message"]["content"]
            .as_str()
            .unwrap_or("...")
            .trim()
            .to_string()
    };

    let pulse_hint = if !req.presented_evidence_ids.is_empty() && s_truth.is_killer {
        26
    } else if !req.presented_evidence_ids.is_empty() {
        14
    } else {
        6
    };

    Ok(AiInterrogateResponse {
        reply,
        pulse_hint,
        used_model: req.model_name,
    })
}
