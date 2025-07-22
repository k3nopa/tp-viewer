use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Deserialize, Serialize)]
struct TriggerPoint {
    #[serde(rename = "ConditionTypeCNF")]
    condition_type_cnf: Option<u8>,
    #[serde(rename = "ConditionTypeDNF")]
    condition_type_dnf: Option<u8>,
    #[serde(rename = "SPT")]
    spts: Vec<SPT>,
}

#[derive(Debug, Deserialize, Serialize)]
struct SipHeader {
    #[serde(rename = "Header")]
    header: String,
    #[serde(rename = "Content")]
    content: String,
}

#[derive(Debug, Deserialize, Serialize)]
struct SPT {
    #[serde(rename = "ConditionNegated", default)]
    condition_negated: Option<u8>,
    #[serde(rename = "Group")]
    group: u8,
    #[serde(rename = "Method", default)]
    method: Option<String>,
    #[serde(rename = "Extension", default)]
    extension: Option<String>,
    #[serde(rename = "SessionCase", default)]
    session_case: Option<u8>,
    #[serde(rename = "RequestURI", default)]
    request_uri: Option<String>,
    #[serde(rename = "SIPHeader", default)]
    sip_header: Option<SipHeader>,
}

impl SPT {
    fn to_english(&self) -> String {
        let mut conditions = Vec::new();

        if let Some(method) = &self.method {
            conditions.push(format!("method is {}", method));
        }

        if let Some(session_case) = self.session_case {
            let session_desc = match session_case {
                0 => "mobile originated",
                1 => "mobile terminated",
                2 => "mobile originated unregistered",
                3 => "mobile terminated unregistered",
                _ => &format!("session case {}", session_case),
            };
            conditions.push(format!("session case is {}", session_desc));
        }

        if let Some(extension) = &self.extension {
            if !extension.is_empty() {
                conditions.push(format!("extension is {}", extension));
            }
        }

        if let Some(request_uri) = &self.request_uri {
            conditions.push(format!("request URI is {}", request_uri));
        }

        if let Some(sip_header) = &self.sip_header {
            conditions.push(format!(
                "\"{}\" header with \"{}\" value",
                sip_header.header, sip_header.content
            ));
        }

        let condition_text = conditions.join(" and ");

        if let Some(negated) = self.condition_negated {
            if negated == 1 {
                format!("not ({})", condition_text)
            } else {
                condition_text
            }
        } else {
            condition_text
        }
    }
}

#[tauri::command]
fn format(content: &str) -> Result<String, String> {
    let trigger_point: TriggerPoint =
        serde_xml_rs::from_str(content).map_err(|_| "failed to parse".to_string())?;

    // TODO: Check that CNF or DNF not having value 0 (always need to be 1).

    let mut groups: HashMap<u8, Vec<&SPT>> = HashMap::new();
    // Group SPTs by their group number
    for spt in &trigger_point.spts {
        groups.entry(spt.group).or_insert_with(Vec::new).push(spt);
    }

    let mut result = String::new();
    let mut group_keys: Vec<u8> = groups.keys().cloned().collect();
    group_keys.sort();

    let is_cnf = match trigger_point.condition_type_cnf {
        Some(_) => true,
        None => false,
    };

    for (i, group_id) in group_keys.iter().enumerate() {
        let spts = &groups[group_id];

        result.push_str("(\n");

        for (j, spt) in spts.iter().enumerate() {
            let condition = spt.to_english();
            result.push_str(&format!("  ({})", condition));

            if j < spts.len() - 1 {
                if is_cnf {
                    result.push_str("\n  or\n");
                }
                // Assuming it's DNF
                else {
                    result.push_str("\n  and\n");
                }
            }
        }

        result.push_str("\n)");

        if i < group_keys.len() - 1 {
            if is_cnf {
                result.push_str("\nand\n");
            } else {
                result.push_str("\nor\n");
            }
        }
    }

    Ok(result)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![format])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
