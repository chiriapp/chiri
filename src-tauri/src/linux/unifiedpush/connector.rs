use gtk::{gio, glib, prelude::*};
use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};

use super::state::PendingEndpoints;

const MESSAGE_EVENT: &str = "unifiedpush://message";
pub(super) const CONNECTOR_PATH: &str = "/org/unifiedpush/Connector";
const CONNECTOR_INTERFACE: &str = "org.unifiedpush.Connector2";
const CONNECTOR_INTROSPECTION_XML: &str = r#"
<node>
  <interface name="org.unifiedpush.Connector2">
    <method name="Message">
      <arg name="args" type="a{sv}" direction="in"/>
      <arg name="result" type="a{sv}" direction="out"/>
    </method>
    <method name="NewEndpoint">
      <arg name="args" type="a{sv}" direction="in"/>
      <arg name="result" type="a{sv}" direction="out"/>
    </method>
    <method name="Unregistered">
      <arg name="args" type="a{sv}" direction="in"/>
      <arg name="result" type="a{sv}" direction="out"/>
    </method>
  </interface>
</node>
"#;

#[derive(Debug, Clone, Serialize)]
struct LinuxUnifiedPushMessageEvent {
    token: String,
    message: String,
}

pub(super) fn gtk_application_dbus_connection(
    app: &AppHandle,
) -> Result<gio::DBusConnection, String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "Main window is not available for UnifiedPush connector".to_string())?;
    let gtk_window = window.gtk_window().map_err(|e| e.to_string())?;
    let gtk_app = gtk_window
        .application()
        .ok_or_else(|| "GTK application is not available for UnifiedPush connector".to_string())?;

    gtk_app
        .dbus_connection()
        .ok_or_else(|| "GTK application has no D-Bus connection".to_string())
}

pub(super) fn register_connector(
    app: AppHandle,
    connection: &gio::DBusConnection,
    pending_endpoints: PendingEndpoints,
) -> Result<gio::RegistrationId, String> {
    let node_info =
        gio::DBusNodeInfo::for_xml(CONNECTOR_INTROSPECTION_XML).map_err(|e| e.to_string())?;
    let interface_info = node_info
        .lookup_interface(CONNECTOR_INTERFACE)
        .ok_or_else(|| "UnifiedPush connector interface metadata is missing".to_string())?;

    connection
        .register_object(
            CONNECTOR_PATH,
            &interface_info,
            move |_connection,
                  _sender,
                  _object_path,
                  _interface_name,
                  method_name,
                  parameters,
                  invocation| {
                handle_method_call(
                    &app,
                    &pending_endpoints,
                    method_name,
                    parameters,
                    invocation,
                );
            },
            |_connection, _sender, _object_path, _interface_name, _property_name| {
                glib::Variant::from(())
            },
            |_connection, _sender, _object_path, _interface_name, _property_name, _value| false,
        )
        .map_err(|e| e.to_string())
}

fn handle_method_call(
    app: &AppHandle,
    pending_endpoints: &PendingEndpoints,
    method_name: &str,
    parameters: glib::Variant,
    invocation: gio::DBusMethodInvocation,
) {
    let Some(args) = parameters.child_value(0).get::<glib::VariantDict>() else {
        return_empty_response(invocation);
        return;
    };

    match method_name {
        "Message" => handle_message(app, &args, invocation),
        "NewEndpoint" => handle_new_endpoint(pending_endpoints, &args, invocation),
        "Unregistered" => handle_unregistered(pending_endpoints, &args, invocation),
        _ => return_empty_response(invocation),
    }
}

fn handle_message(
    app: &AppHandle,
    args: &glib::VariantDict,
    invocation: gio::DBusMethodInvocation,
) {
    if let Ok(Some(token)) = args.lookup::<String>("token") {
        let message_len = args
            .lookup_value("message", None)
            .and_then(|value| value.fixed_array::<u8>().ok().map(|bytes| bytes.len()))
            .unwrap_or(0);
        let message = format!("Linux UnifiedPush message ({message_len} bytes)");

        let _ = app.emit(
            MESSAGE_EVENT,
            LinuxUnifiedPushMessageEvent { token, message },
        );
    }

    let response = glib::VariantDict::default();
    if let Ok(Some(id)) = args.lookup::<String>("id") {
        response.insert("id", id);
    }
    return_response(invocation, response);
}

fn handle_new_endpoint(
    pending_endpoints: &PendingEndpoints,
    args: &glib::VariantDict,
    invocation: gio::DBusMethodInvocation,
) {
    if let (Ok(Some(token)), Ok(Some(endpoint))) = (
        args.lookup::<String>("token"),
        args.lookup::<String>("endpoint"),
    ) {
        if let Ok(mut pending) = pending_endpoints.lock() {
            if let Some(sender) = pending.remove(&token) {
                let _ = sender.send(endpoint);
            }
        }
    }

    return_empty_response(invocation);
}

fn handle_unregistered(
    pending_endpoints: &PendingEndpoints,
    args: &glib::VariantDict,
    invocation: gio::DBusMethodInvocation,
) {
    if let Ok(Some(token)) = args.lookup::<String>("token") {
        if let Ok(mut pending) = pending_endpoints.lock() {
            pending.remove(&token);
        }
    }

    return_empty_response(invocation);
}

fn return_empty_response(invocation: gio::DBusMethodInvocation) {
    return_response(invocation, glib::VariantDict::default());
}

fn return_response(invocation: gio::DBusMethodInvocation, response: glib::VariantDict) {
    let response = response.end();
    let parameters = glib::Variant::tuple_from_iter([response]);
    invocation.return_value(Some(&parameters));
}
