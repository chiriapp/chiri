use std::collections::HashMap;

use zbus::zvariant::{OwnedValue, Value};

pub(super) type VariantDict = HashMap<String, OwnedValue>;

pub(super) fn owned_value(value: impl Into<Value<'static>>) -> zbus::fdo::Result<OwnedValue> {
    value
        .into()
        .try_into()
        .map_err(|error| zbus::fdo::Error::Failed(format!("Invalid D-Bus value: {error}")))
}

pub(super) fn get_string(args: &VariantDict, key: &str) -> Option<String> {
    args.get(key)
        .and_then(|value| <&str>::try_from(value).ok())
        .map(ToString::to_string)
}
