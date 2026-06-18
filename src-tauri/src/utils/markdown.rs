use pulldown_cmark::{html, Parser};

#[tauri::command]
pub fn parse_and_sanitize_markdown(markdown: String) -> String {
    // Parse Markdown to HTML
    let parser = Parser::new(&markdown);
    let mut html_output = String::new();
    html::push_html(&mut html_output, parser);

    // Sanitize the HTML output using ammonia
    ammonia::clean(&html_output)
}
