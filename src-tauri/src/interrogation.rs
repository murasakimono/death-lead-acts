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

pub fn run_confrontation(seed: &str, suspect_a_id: &str, suspect_b_id: &str) -> ConfrontationResult {
    let (case_file, truth) = generate_case(seed, "detective");
    let sa = case_file.suspects.iter().find(|s| s.id == suspect_a_id);
    let sb = case_file.suspects.iter().find(|s| s.id == suspect_b_id);
    let (Some(a), Some(b)) = (sa, sb) else {
        return ConfrontationResult {
            dramatic_hit: false,
            pulse_spike: 0,
            dialogue: vec!["Yüzleştirilecek şüpheliler bulunamadı.".to_string()],
            revealed_secret: None,
            unlocked_evidence_id: None,
        };
    };

    // Case 1: Confronting Killer + Accomplice (Breaks their dual alibi!)
    if let Some(acc_id) = &truth.accomplice_id {
        let pair_match = (a.id == truth.killer_id && b.id == *acc_id)
            || (b.id == truth.killer_id && a.id == *acc_id);
        if pair_match {
            return ConfrontationResult {
                dramatic_hit: true,
                pulse_spike: 58,
                dialogue: vec![
                    format!("{}: \"Dedektif, az önce söyledik — o saatte ikimiz birlikteydik!\"", a.name),
                    format!("{}: \"...Hayır, dur! Ben sadece koridor kamerasını oyaladım, içeri girip {}'yi öldüreceğini bilmiyordum!\"", b.name, case_file.victim_name),
                    format!("{}: \"Kapa çeneni! Anlaşmamız böyle değildi, ikimizi de yaktın!\"", a.name),
                ],
                revealed_secret: Some(format!(
                    "ORTAK YALAN ÇÖKTÜ! {} ve {} işbirlikçi — sahte ikili alibi kurmuşlar!",
                    a.name, b.name
                )),
                unlocked_evidence_id: Some("ev_act2_lab".to_string()),
            };
        }
    }

    // Case 2: Confronting Killer + Witness/Red Herring who saw them
    if a.id == truth.killer_id || b.id == truth.killer_id {
        let killer = if a.id == truth.killer_id { a } else { b };
        let other = if a.id == truth.killer_id { b } else { a };
        return ConfrontationResult {
            dramatic_hit: true,
            pulse_spike: 34,
            dialogue: vec![
                format!("{}: \"Yüzüme bak {}! O gece koridorda seni gördüm, evde değildin!\"", other.name, killer.name),
                format!("{}: \"Saçmalama! Kendi pisliğini örtmek için bana iftira atıyorsun dedektif, buna inanmayın!\"", killer.name),
            ],
            revealed_secret: Some(format!(
                "YÜZLEŞTİRME ÇATIŞMASI: {} doğrudan {} aleyhine tanıklık etti; {} nabzı fırladı.",
                other.name, killer.name, killer.name
            )),
            unlocked_evidence_id: None,
        };
    }

    // Case 3: Two innocent suspects
    ConfrontationResult {
        dramatic_hit: false,
        pulse_spike: 8,
        dialogue: vec![
            format!("{}: \"Bizi neden aynı odaya aldınız dedektif? {} ile o gece hiç karşılaşmadık.\"", a.name, b.name),
            format!("{}: \"Doğru söylüyor, asıl diğerlerinin saatlerini ve telefon kayıtlarını çaprazlayın.\"", b.name),
        ],
        revealed_secret: None,
        unlocked_evidence_id: None,
    }
}

pub fn run_tactic(seed: &str, suspect_id: &str, tactic: &str) -> TacticResult {
    let (case_file, truth) = generate_case(seed, "detective");
    let Some(suspect) = case_file.suspects.iter().find(|s| s.id == suspect_id) else {
        return TacticResult {
            success: false,
            pulse_delta: 0,
            reply: "Şüpheli bulunamadı.".to_string(),
            revealed_secret: None,
            reputation_delta: 0,
        };
    };
    let s_truth = truth.suspect_secrets.iter().find(|s| s.suspect_id == suspect_id);
    let is_guilty = s_truth.map(|t| t.is_killer || t.is_accomplice).unwrap_or(false);
    let has_secret = s_truth.map(|t| !t.active_lie.contains("Yalan söylemiyor")).unwrap_or(false);
    let is_nervous = suspect.archetype_tag.contains("Gergin") || suspect.archetype_tag.contains("Panik") || suspect.archetype_tag.contains("İçe Dönük");
    let is_cold = suspect.archetype_tag.contains("Soğukkanlı") || suspect.archetype_tag.contains("Otoriter") || suspect.archetype_tag.contains("Manipülatif");

    match tactic {
        "aggressive" => {
            if is_nervous || has_secret {
                TacticResult {
                    success: true,
                    pulse_delta: 28,
                    reply: format!(
                        "{} (sesi titreyerek): \"Üstüme gelmeyin! Tamam, her şeyi anlatmadım ama o gece koridorda tek başıma değildim — zaman çizelgesine bakın!\"",
                        suspect.name
                    ),
                    revealed_secret: Some(format!("SERT BASKI İŞE YARADI: {} panikledi ({}).", suspect.name, suspect.archetype_tag)),
                    reputation_delta: 0,
                }
            } else {
                TacticResult {
                    success: false,
                    pulse_delta: 4,
                    reply: format!(
                        "{} (soğukkanlı): \"Bağırarak beni korkutabileceğinizi sanıyorsanız yanılıyorsunuz dedektif. Somut kanıtınız varsa masaya koyun.\"",
                        suspect.name
                    ),
                    revealed_secret: None,
                    reputation_delta: 0,
                }
            }
        }
        "sympathetic" => {
            if !is_cold {
                TacticResult {
                    success: true,
                    pulse_delta: -6,
                    reply: format!(
                        "{} (derin nefes alarak): \"Bakın dedektif... kimseye zarar vermedim. Ama {} o gece çok gergindi, telefonunda sakladığı bir dosya yüzünden biriyle kavga etti.\"",
                        suspect.name, case_file.victim_name
                    ),
                    revealed_secret: Some(format!("EMPATİ İŞE YARADI: {} savunmayı indirdi ve kurbanın son kavgasını doğruladı.", suspect.name)),
                    reputation_delta: 0,
                }
            } else {
                TacticResult {
                    success: false,
                    pulse_delta: 2,
                    reply: format!(
                        "{} (alaycı): \"İyi polis oyunu mu oynuyoruz? Bu numaraları geçelim.\"",
                        suspect.name
                    ),
                    revealed_secret: None,
                    reputation_delta: 0,
                }
            }
        }
        "bluff" => {
            if is_guilty && !is_cold {
                TacticResult {
                    success: true,
                    pulse_delta: 48,
                    reply: format!(
                        "{} (rengi soldu): \"Ne?! Laboratuvar raporunda benim izim mi çıktı?! Bekleyin... oraya sadece konuşmaya gittim, her şey bir anda oldu!\"",
                        suspect.name
                    ),
                    revealed_secret: Some(format!("BLÖF TUTTU! {} ağzından olay yerinde olduğunu kaçırdı!", suspect.name)),
                    reputation_delta: 0,
                }
            } else if has_secret && !is_guilty {
                TacticResult {
                    success: true,
                    pulse_delta: 36,
                    reply: format!(
                        "{} (panikle): \"Durun! Kamera kaydınız varsa söyleyeyim — evet koridordaydım ama cinayetle ilgim yok, kendi sırrım yüzünden oradaydım!\"",
                        suspect.name
                    ),
                    revealed_secret: Some(format!("BLÖF TUTTU: {} kendi gizli sırrını açık etti (ama asıl fail olmayabilir).", suspect.name)),
                    reputation_delta: 0,
                }
            } else {
                TacticResult {
                    success: false,
                    pulse_delta: -5,
                    reply: format!(
                        "{} (gözlerini kısarak): \"Blöf yapıyorsunuz dedektif. Öyle bir rapor olsaydı çoktan tutuklama emriyle gelirdiniz. Savcılığa şikâyet edeceğim!\"",
                        suspect.name
                    ),
                    revealed_secret: None,
                    reputation_delta: -1,
                }
            }
        }
        _ => TacticResult {
            success: false,
            pulse_delta: 0,
            reply: "Bilinmeyen taktik.".to_string(),
            revealed_secret: None,
            reputation_delta: 0,
        },
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
            message: "HATALI PIN — Olay yerindeki çerçeveyi arka yüzüne çevirip el yazısı notu oku (OLY-02).".to_string(),
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
            message: "HATALI KOMBİNASYON — OLY-02 çerçevesinin arka yüzündeki 3 kadran sayısını kontrol et.".to_string(),
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

    let verdict_ok = sub.verdict_type == truth.resolution_type;

    let c1 = if truth.resolution_type == "accident_suicide" {
        verdict_ok
    } else if truth.resolution_type == "accomplice" {
        verdict_ok
            && sub.killer_id == truth.killer_id
            && sub.accomplice_id.as_deref() == truth.accomplice_id.as_deref()
    } else {
        verdict_ok && sub.killer_id == truth.killer_id
    };

    let c2 = sub.method_evidence_id == truth.method_evidence_id
        || sub.method_evidence_id == "ev_act2_lab"
        || sub.method_evidence_id == "ev_chem_match"
        || sub.method_evidence_id == "ev_autopsy";
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
        _ => "F — DAVA ÇÖKTÜ (YANLIŞ HÜKÜM)",
    }
    .to_string();

    let lock1_expected = match truth.resolution_type.as_str() {
        "accident_suicide" => "CİNAYET DEĞİL — Kaza / İntihar Dosyası".to_string(),
        "accomplice" => format!(
            "2 İŞBİRLİKÇİ: {} + {}",
            truth.killer_name,
            truth.accomplice_name.clone().unwrap_or_default()
        ),
        _ => format!("TEK FAİL: {}", truth.killer_name),
    };

    AccusationResult {
        solved,
        score,
        rank,
        resolution_type: truth.resolution_type,
        locks: vec![
            LockCheck {
                label: "1. Kilit — Hüküm & Fail(ler)".to_string(),
                correct: c1,
                expected_hint: lock1_expected,
            },
            LockCheck {
                label: "2. Kilit — Yöntem & Adli Kanıt".to_string(),
                correct: c2,
                expected_hint: find_ev_title(&truth.method_evidence_id),
            },
            LockCheck {
                label: "3. Kilit — Alibi / Zaman Delili".to_string(),
                correct: c3,
                expected_hint: find_ev_title(&truth.alibi_evidence_id),
            },
            LockCheck {
                label: "4. Kilit — Motivasyon / Arka Plan".to_string(),
                correct: c4,
                expected_hint: find_ev_title(&truth.motive_evidence_id),
            },
        ],
        killer_name: truth.killer_name,
        accomplice_name: truth.accomplice_name,
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
                OllamaStatus { online: true, models, error: None }
            } else {
                OllamaStatus { online: true, models: vec![], error: None }
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
        4. Gerçek fail/işbirlikçi olsan bile kolayca teslim olma; köşeye sıkışınca tereddüt et veya avukat iste.",
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

    let mut messages = vec![serde_json::json!({ "role": "system", "content": system_prompt })];
    for h in req.history.iter().rev().take(10).rev() {
        messages.push(serde_json::json!({ "role": h.role, "content": h.content }));
    }
    messages.push(serde_json::json!({ "role": "user", "content": req.user_message }));

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
        serde_json::json!({ "model": req.model_name, "messages": messages, "temperature": 0.7 })
    } else {
        serde_json::json!({ "model": req.model_name, "messages": messages, "stream": false, "options": { "temperature": 0.7 } })
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
        body["choices"][0]["message"]["content"].as_str().unwrap_or("...").trim().to_string()
    } else {
        body["message"]["content"].as_str().unwrap_or("...").trim().to_string()
    };

    let pulse_hint = if !req.presented_evidence_ids.is_empty() && (s_truth.is_killer || s_truth.is_accomplice) {
        28
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
