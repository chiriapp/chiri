use super::locale::{region_from_locale, unicode_keyword_value};

pub(super) fn date_format_from_locale(locale: &str) -> Option<&'static str> {
    region_from_locale(locale).and_then(|region| default_date_format_for_region(&region))
}

pub(super) fn time_format_from_locale(locale: &str) -> Option<&'static str> {
    hour_cycle_time_format_from_locale(locale).or_else(|| {
        region_from_locale(locale).and_then(|region| default_time_format_for_region(&region))
    })
}

pub(super) fn infer_date_format(format: &str) -> Option<&'static str> {
    let symbols = date_pattern_symbols(format);
    let first = symbols.first()?;

    if *first == 'y' {
        return Some("yyyy-MM-dd");
    }

    match (*first, symbols.get(1).copied()) {
        ('m', Some('d')) => Some("MM/dd/yyyy"),
        ('d', Some('m')) => Some("dd/MM/yyyy"),
        ('d', Some('M')) => Some("d MMM yyyy"),
        ('M', Some('d')) => Some("MMM d, yyyy"),
        _ => None,
    }
}

pub(super) fn infer_time_format(format: &str) -> Option<&'static str> {
    let lower = format.to_ascii_lowercase();

    if lower.contains("%r")
        || format.contains("%I")
        || format.contains('h')
        || format.contains('K')
        || lower.contains("tt")
        || lower.contains('a')
    {
        return Some("12");
    }

    if lower.contains("%t") || format.contains("%H") || format.contains('H') || format.contains('k')
    {
        return Some("24");
    }

    None
}

fn date_pattern_symbols(format: &str) -> Vec<char> {
    let mut symbols = Vec::new();
    let mut previous = None;
    let chars: Vec<char> = format.chars().collect();
    let mut index = 0;

    while index < chars.len() {
        let ch = chars[index];
        let run_length = chars[index..]
            .iter()
            .take_while(|candidate| **candidate == ch)
            .count();
        let symbol = match ch {
            'y' | 'Y' => Some('y'),
            'm' => Some('m'),
            'M' => Some(if run_length >= 3 { 'M' } else { 'm' }),
            'b' | 'B' => Some('M'),
            'd' | 'D' | 'e' => Some('d'),
            _ => None,
        };

        if let Some(symbol) = symbol {
            if previous != Some(symbol) {
                symbols.push(symbol);
                previous = Some(symbol);
            }
        } else {
            previous = None;
        }

        index += run_length.max(1);
    }

    symbols
}

fn hour_cycle_time_format_from_locale(locale: &str) -> Option<&'static str> {
    match unicode_keyword_value(locale, "hc")?.as_str() {
        "h11" | "h12" | "c12" => Some("12"),
        "h23" | "h24" | "c24" => Some("24"),
        _ => None,
    }
}

fn default_date_format_for_region(region: &str) -> Option<&'static str> {
    match region {
        "US" | "FM" | "MH" | "PW" | "PH" => Some("MM/dd/yyyy"),
        "CN" | "HU" | "IR" | "JP" | "KR" | "LT" | "SE" => Some("yyyy-MM-dd"),
        _ => Some("dd/MM/yyyy"),
    }
}

fn default_time_format_for_region(region: &str) -> Option<&'static str> {
    match region {
        "AU" | "CA" | "EG" | "IN" | "NZ" | "PH" | "PK" | "SA" | "US" => Some("12"),
        _ => Some("24"),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn infers_supported_date_formats() {
        assert_eq!(infer_date_format("%m/%d/%Y"), Some("MM/dd/yyyy"));
        assert_eq!(infer_date_format("%d/%m/%Y"), Some("dd/MM/yyyy"));
        assert_eq!(infer_date_format("M/d/yyyy"), Some("MM/dd/yyyy"));
        assert_eq!(infer_date_format("yyyy-MM-dd"), Some("yyyy-MM-dd"));
        assert_eq!(infer_date_format("d MMM yyyy"), Some("d MMM yyyy"));
    }

    #[test]
    fn infers_supported_time_formats() {
        assert_eq!(infer_time_format("%I:%M:%S %p"), Some("12"));
        assert_eq!(infer_time_format("h:mm tt"), Some("12"));
        assert_eq!(infer_time_format("%H:%M:%S"), Some("24"));
        assert_eq!(infer_time_format("HH:mm"), Some("24"));
    }

    #[test]
    fn honors_unicode_locale_overrides_for_date_and_time() {
        assert_eq!(
            date_format_from_locale("en_US@rg=gbzzzz"),
            Some("dd/MM/yyyy")
        );
        assert_eq!(time_format_from_locale("en_US@rg=gbzzzz"), Some("24"));
        assert_eq!(time_format_from_locale("en_US@hc=h23"), Some("24"));
    }
}
