use serde::Serialize;

#[derive(Debug, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemRegionPreferences {
    pub locale: Option<String>,
    pub timezone: Option<String>,
    pub date_format: Option<&'static str>,
    pub time_format: Option<&'static str>,
    pub start_of_week: Option<&'static str>,
}

#[derive(Debug, Default)]
pub(super) struct NativeRegionPreferences {
    pub(super) locale: Option<String>,
    pub(super) date_format: Option<&'static str>,
    pub(super) time_format: Option<&'static str>,
    pub(super) start_of_week: Option<&'static str>,
}
