use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoomRect {
    pub id: String,
    pub name: String,
    pub x: f32,
    pub y: f32,
    pub w: f32,
    pub h: f32,
    pub has_camera: bool,
    pub camera_angle: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SceneHotspot {
    pub id: String,
    pub room_id: String,
    pub label: String,
    pub x: f32,
    pub y: f32,
    pub uv_only: bool,
    pub evidence_id: String,
    pub inspect_text: String,
    pub inspect_kind: String, // "frame_flip" | "torn_note" | "uv_macro" | "terminal"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InspectableProps {
    pub frame_front_title: String,
    pub frame_front_subtitle: String,
    pub frame_back_handwriting: String,
    pub torn_note_fragments: Vec<String>,
    pub torn_note_full: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EvidenceItem {
    pub id: String,
    pub code: String,
    pub title: String,
    pub category: String,
    pub summary: String,
    pub detail: String,
    pub timestamp: Option<String>,
    pub suspect_id: Option<String>,
    pub unlocked_by_default: bool,
    pub unlock_source: String,
    pub is_uv_trace: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FollowUpQuestion {
    pub id: String,
    pub question: String,
    pub answer: String,
    pub pulse_bump: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Statement {
    pub id: String,
    pub act: u8,
    pub text: String,
    pub press_reply: String,
    pub is_lie: bool,
    pub contradicted_by: Option<String>,
    pub break_reply: Option<String>,
    pub reveals_secret: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimelineEntry {
    pub suspect_id: String,
    pub start_min: u32,
    pub end_min: u32,
    pub location: String,
    pub is_claimed: bool,
    pub evidence_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Suspect {
    pub id: String,
    pub portrait_index: usize,
    pub name: String,
    pub role: String,
    pub age: u8,
    pub handedness: String,
    pub blood_type: String,
    pub archetype_tag: String,
    pub portrait_accent: String,
    pub base_pulse: u32,
    pub alibi_summary: String,
    pub statements: Vec<Statement>,
    pub follow_ups: Vec<FollowUpQuestion>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PhoneMessage {
    pub sender: String,
    pub time: String,
    pub text: String,
    pub deleted: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PhonePuzzle {
    pub owner_name: String,
    pub hint_text: String,
    pub pin_length: usize,
    pub unlocked_evidence_ids: Vec<String>,
    pub messages: Vec<PhoneMessage>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CellTower {
    pub id: String,
    pub name: String,
    pub x: f32,
    pub y: f32,
    pub radius: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TriangulationPuzzle {
    pub target_suspect_name: String,
    pub signal_time: String,
    pub towers: Vec<CellTower>,
    pub target_x: f32,
    pub target_y: f32,
    pub tolerance: f32,
    pub location_name: String,
    pub unlocked_evidence_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AutopsyPuzzle {
    pub body_temp_c: f32,
    pub ambient_temp_c: f32,
    pub found_time_str: String,
    pub rigor_stage: String,
    pub livor_stage: String,
    pub onset_delay_min: u32,
    pub forensic_notes: String,
    pub true_death_start_min: u32,
    pub true_death_end_min: u32,
    pub unlocked_evidence_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioPuzzle {
    pub channel_name: String,
    pub recorded_at: String,
    pub target_freq: u32,
    pub target_threshold: u32,
    pub clean_transcript: String,
    pub unlocked_evidence_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CctvPuzzle {
    pub camera_label: String,
    pub target_frame: u32,
    pub anomaly_time: String,
    pub anomaly_desc: string_alias::Str,
    pub unlocked_evidence_id: String,
}

mod string_alias {
    pub type Str = String;
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChemCompound {
    pub id: String,
    pub name: String,
    pub bars: Vec<u8>,
    pub effect: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChemPuzzle {
    pub sample_label: String,
    pub unknown_bars: Vec<u8>,
    pub compounds: Vec<ChemCompound>,
    pub correct_compound_id: String,
    pub unlocked_evidence_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SafePuzzle {
    pub label: String,
    pub hint_text: String,
    pub unlocked_evidence_id: String,
    pub contents_summary: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BodyZone {
    pub id: String,
    pub label: String,
    pub x: f32,
    pub y: f32,
    pub finding: String,
    pub critical: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BodyMapPuzzle {
    pub subject_label: String,
    pub zones: Vec<BodyZone>,
    pub unlocked_evidence_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CaseFile {
    pub seed: String,
    pub case_code: String,
    pub difficulty: String,
    pub max_hints: u8,
    pub max_reputation: u8,
    pub time_limit_sec: Option<u32>,
    pub crime_type: String,
    pub crime_badge: String,
    pub scene_weather: String, // "rain" | "blackout" | "fog"
    pub venue_index: usize,
    pub title: String,
    pub venue_name: String,
    pub venue_subtitle: String,
    pub date_str: String,
    pub victim_name: String,
    pub victim_role: String,
    pub victim_age: u8,
    pub briefing: String,
    pub inspectable_props: InspectableProps,
    pub rooms: Vec<RoomRect>,
    pub hotspots: Vec<SceneHotspot>,
    pub suspects: Vec<Suspect>,
    pub evidence: Vec<EvidenceItem>,
    pub timeline: Vec<TimelineEntry>,
    pub phone_puzzle: PhonePuzzle,
    pub triangulation_puzzle: TriangulationPuzzle,
    pub autopsy_puzzle: AutopsyPuzzle,
    pub audio_puzzle: AudioPuzzle,
    pub cctv_puzzle: CctvPuzzle,
    pub chem_puzzle: ChemPuzzle,
    pub safe_puzzle: SafePuzzle,
    pub body_map_puzzle: BodyMapPuzzle,
    pub hints: Vec<String>,
    pub act2_drop_title: String,
    pub act2_drop_body: String,
}

#[derive(Debug, Clone)]
pub struct CaseTruth {
    pub resolution_type: String, // "single_culprit" | "accomplice" | "accident_suicide"
    pub killer_id: String,
    pub killer_name: String,
    pub accomplice_id: Option<String>,
    pub accomplice_name: Option<String>,
    pub method_evidence_id: String,
    pub alibi_evidence_id: String,
    pub motive_evidence_id: String,
    pub phone_pin: String,
    pub safe_combo: [u8; 3],
    pub motive_summary: String,
    pub method_summary: String,
    pub chronological_reveal: Vec<String>,
    pub suspect_secrets: Vec<SuspectTruth>,
}

#[derive(Debug, Clone)]
pub struct SuspectTruth {
    pub suspect_id: String,
    pub is_killer: bool,
    pub is_accomplice: bool,
    pub personality: String,
    pub real_actions: String,
    pub active_lie: String,
    pub hidden_secret: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PresentResult {
    pub hit: bool,
    pub pulse_delta: i32,
    pub reply: String,
    pub revealed_secret: Option<String>,
    pub reputation_delta: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfrontationResult {
    pub dramatic_hit: bool,
    pub pulse_spike: i32,
    pub dialogue: Vec<String>,
    pub revealed_secret: Option<String>,
    pub unlocked_evidence_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PinVerifyResult {
    pub unlocked: bool,
    pub message: String,
    pub unlocked_evidence_ids: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccusationSubmission {
    pub seed: String,
    pub verdict_type: String, // "single_culprit" | "accomplice" | "accident_suicide"
    pub killer_id: String,
    pub accomplice_id: Option<String>,
    pub method_evidence_id: String,
    pub alibi_evidence_id: String,
    pub motive_evidence_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LockCheck {
    pub label: String,
    pub correct: bool,
    pub expected_hint: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccusationResult {
    pub solved: bool,
    pub score: u8,
    pub rank: String,
    pub resolution_type: String,
    pub locks: Vec<LockCheck>,
    pub killer_name: String,
    pub accomplice_name: Option<String>,
    pub method_summary: String,
    pub motive_summary: String,
    pub chronological_reveal: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiInterrogateRequest {
    pub seed: String,
    pub suspect_id: String,
    pub user_message: String,
    pub history: Vec<AiChatMessage>,
    pub presented_evidence_ids: Vec<String>,
    pub broken_statement_ids: Vec<String>,
    pub endpoint_url: String,
    pub model_name: String,
    pub api_key: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiInterrogateResponse {
    pub reply: String,
    pub pulse_hint: i32,
    pub used_model: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OllamaStatus {
    pub online: bool,
    pub models: Vec<String>,
    pub error: Option<String>,
}
