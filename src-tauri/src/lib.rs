mod campaign;
mod generator;
mod interrogation;
mod models;

use campaign::CampaignChapter;
use models::*;

#[tauri::command]
fn get_campaign() -> Vec<CampaignChapter> {
    campaign::get_shadow_campaign()
}

#[tauri::command]
fn new_case(seed: String, difficulty: Option<String>) -> CaseFile {
    let diff = difficulty.unwrap_or_else(|| "detective".to_string());
    let (case_file, _) = generator::generate_case(&seed, &diff);
    case_file
}

#[tauri::command]
fn present_evidence(
    seed: String,
    suspect_id: String,
    statement_id: String,
    evidence_id: String,
) -> PresentResult {
    interrogation::verify_present_evidence(&seed, &suspect_id, &statement_id, &evidence_id)
}

#[tauri::command]
fn confront_suspects(
    seed: String,
    suspect_a_id: String,
    suspect_b_id: String,
) -> ConfrontationResult {
    interrogation::run_confrontation(&seed, &suspect_a_id, &suspect_b_id)
}

#[tauri::command]
fn apply_tactic(seed: String, suspect_id: String, tactic: String) -> TacticResult {
    interrogation::run_tactic(&seed, &suspect_id, &tactic)
}

#[tauri::command]
fn verify_pin(seed: String, pin: String) -> PinVerifyResult {
    interrogation::verify_phone_pin(&seed, &pin)
}

#[tauri::command]
fn verify_safe(seed: String, c1: u8, c2: u8, c3: u8) -> PinVerifyResult {
    interrogation::verify_safe_combo(&seed, c1, c2, c3)
}

#[tauri::command]
fn submit_accusation(submission: AccusationSubmission) -> AccusationResult {
    interrogation::verify_accusation(submission)
}

#[tauri::command]
async fn get_ollama_status(endpoint_url: String) -> OllamaStatus {
    interrogation::check_ollama(&endpoint_url).await
}

#[tauri::command]
async fn ai_interrogate(request: AiInterrogateRequest) -> Result<AiInterrogateResponse, String> {
    interrogation::run_ai_interrogation(request).await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_campaign,
            new_case,
            present_evidence,
            confront_suspects,
            apply_tactic,
            verify_pin,
            verify_safe,
            submit_accusation,
            get_ollama_status,
            ai_interrogate
        ])
        .run(tauri::generate_context!())
        .expect("Death Lead Acts çalıştırılırken hata oluştu");
}
