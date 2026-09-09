pub(super) fn region_from_locale(locale: &str) -> Option<String> {
    if let Some(region) = unicode_keyword_value(locale, "rg").and_then(|value| {
        let region: String = value.chars().take(2).collect();
        (region.len() == 2).then(|| region.to_ascii_uppercase())
    }) {
        return Some(region);
    }

    let normalized = locale
        .split('.')
        .next()
        .unwrap_or(locale)
        .split('@')
        .next()
        .unwrap_or(locale)
        .split("-u-")
        .next()
        .unwrap_or(locale);

    let parts: Vec<&str> = normalized.split(['-', '_']).collect();
    let region = parts
        .iter()
        .skip(1)
        .find(|part| part.len() == 2 || part.len() == 3)?;

    Some(region.to_ascii_uppercase())
}

pub(super) fn locale_identifier_for_cldr(locale: &str) -> String {
    let (raw_base, raw_keywords) = locale.split_once('@').unwrap_or((locale, ""));
    let base = raw_base
        .split('.')
        .next()
        .unwrap_or(raw_base)
        .replace('_', "-");
    let keywords = legacy_locale_keywords(raw_keywords);

    if keywords.is_empty() {
        return base;
    }

    let mut tag = base;
    if !tag.to_ascii_lowercase().contains("-u-") {
        tag.push_str("-u");
    }

    for (key, value) in keywords {
        tag.push('-');
        tag.push_str(&key);
        tag.push('-');
        tag.push_str(&value);
    }

    tag
}

pub(super) fn unicode_keyword_value(locale: &str, key: &str) -> Option<String> {
    let tag = locale_identifier_for_cldr(locale).to_ascii_lowercase();
    let extension = tag.split("-u-").nth(1)?;
    let tokens: Vec<&str> = extension.split('-').collect();
    let mut index = 0;

    while index < tokens.len() {
        let token = tokens[index];
        if token.len() != 2 {
            index += 1;
            continue;
        }

        index += 1;
        let value_start = index;
        while index < tokens.len() && tokens[index].len() != 2 {
            index += 1;
        }

        if token == key && value_start < index {
            return Some(tokens[value_start..index].join("-"));
        }
    }

    None
}

fn legacy_locale_keywords(keywords: &str) -> Vec<(String, String)> {
    keywords
        .split([';', ','])
        .filter_map(|part| {
            let (key, value) = part.split_once('=')?;
            let key = key.trim().to_ascii_lowercase();
            let mut value = value.trim().replace('_', "-").to_ascii_lowercase();
            if key == "rg" && value.len() == 2 {
                value.push_str("zzzz");
            }

            (!key.is_empty() && !value.is_empty()).then_some((key, value))
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extracts_region_from_common_locale_shapes() {
        assert_eq!(region_from_locale("en_US.UTF-8").as_deref(), Some("US"));
        assert_eq!(region_from_locale("sr-Latn-RS").as_deref(), Some("RS"));
        assert_eq!(region_from_locale("fr-CA").as_deref(), Some("CA"));
        assert_eq!(region_from_locale("en_US@rg=gbzzzz").as_deref(), Some("GB"));
        assert_eq!(
            region_from_locale("en-US-u-rg-kzzzzz").as_deref(),
            Some("KZ")
        );
    }

    #[test]
    fn converts_apple_keywords_to_bcp47_unicode_extensions() {
        assert_eq!(
            locale_identifier_for_cldr("en_US@rg=gbzzzz"),
            "en-US-u-rg-gbzzzz"
        );
        assert_eq!(
            locale_identifier_for_cldr("en_US.UTF-8@rg=KZ;hc=h23"),
            "en-US-u-rg-kzzzzz-hc-h23"
        );
    }
}
