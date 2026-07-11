use pulldown_cmark::{html, Parser};

fn is_allowed_changelog_image_src(value: &str) -> bool {
    let Some(after_scheme) = value.strip_prefix("https://") else {
        return false;
    };

    let (authority, path) =
        after_scheme
            .split_once(['/', '?', '#'])
            .map_or((after_scheme, ""), |(authority, rest)| {
                (
                    authority,
                    &after_scheme[authority.len()..authority.len() + 1 + rest.len()],
                )
            });
    if authority.is_empty() || authority.contains('@') {
        return false;
    }

    let host = authority
        .split_once(':')
        .map_or(authority, |(host, _port)| host)
        .to_ascii_lowercase();

    match host.as_str() {
        "github.com" => {
            path.starts_with("/chiriapp/chiri/")
                || path.starts_with("/user-attachments/assets/")
                || path.starts_with("/assets/")
        }
        "raw.githubusercontent.com" => path.starts_with("/chiriapp/chiri/"),
        "user-images.githubusercontent.com"
        | "private-user-images.githubusercontent.com"
        | "camo.githubusercontent.com" => true,
        _ => false,
    }
}

#[tauri::command]
pub fn parse_and_sanitize_markdown(markdown: String) -> String {
    // parse Markdown to HTML
    let parser = Parser::new(&markdown);
    let mut html_output = String::new();
    html::push_html(&mut html_output, parser);

    // sanitize the HTML output using ammonia. keep changelog images, but only
    // from GitHub-controlled origins so release notes cannot beacon arbitrary
    // third-party hosts when rendered
    ammonia::Builder::default()
        .attribute_filter(|element, attribute, value| {
            if element == "img" && attribute == "src" {
                return is_allowed_changelog_image_src(value).then(|| value.into());
            }
            Some(value.into())
        })
        .clean(&html_output)
        .to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn keeps_github_release_note_images() {
        let html = parse_and_sanitize_markdown(
            "![demo](https://github.com/user-attachments/assets/abc123)".to_string(),
        );

        assert!(html.contains(r#"<img src="https://github.com/user-attachments/assets/abc123""#));
    }

    #[test]
    fn strips_non_github_changelog_image_sources() {
        let html = parse_and_sanitize_markdown(
            "![tracker](https://tracker.example/pixel.png)".to_string(),
        );

        assert!(html.contains(r#"<img alt="tracker">"#));
        assert!(!html.contains("tracker.example"));
    }

    #[test]
    fn strips_relative_changelog_image_sources() {
        let html = parse_and_sanitize_markdown("![local](/pixel.png)".to_string());

        assert!(html.contains(r#"<img alt="local">"#));
        assert!(!html.contains("/pixel.png"));
    }
}
