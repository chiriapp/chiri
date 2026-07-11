use zbus::{fdo::DBusProxy, Connection};

const DISTRIBUTOR_PREFIX: &str = "org.unifiedpush.Distributor.";

#[derive(Debug, Clone, Default, PartialEq, Eq)]
struct DistributorNames {
    running: Vec<String>,
    activatable: Vec<String>,
}

impl DistributorNames {
    fn contains(&self, distributor: &str) -> bool {
        self.running.iter().any(|name| name == distributor)
            || self.activatable.iter().any(|name| name == distributor)
    }

    fn all(&self) -> Vec<String> {
        let mut names = self.running.clone();
        names.extend(self.activatable.clone());
        sort_and_dedup_distributors(&mut names);
        names
    }
}

fn sort_and_dedup_distributors(names: &mut Vec<String>) {
    names.sort();
    names.dedup();
}

async fn discover_distributors(connection: &Connection) -> Result<DistributorNames, String> {
    let proxy = DBusProxy::new(connection)
        .await
        .map_err(|e| e.to_string())?;
    let mut running: Vec<String> = proxy
        .list_names()
        .await
        .map_err(|e| e.to_string())?
        .into_iter()
        .map(|name| name.to_string())
        .filter(|name| name.starts_with(DISTRIBUTOR_PREFIX))
        .collect();
    sort_and_dedup_distributors(&mut running);

    let mut activatable: Vec<String> = proxy
        .list_activatable_names()
        .await
        .map_err(|e| e.to_string())?
        .into_iter()
        .map(|name| name.to_string())
        .filter(|name| name.starts_with(DISTRIBUTOR_PREFIX))
        .collect();
    sort_and_dedup_distributors(&mut activatable);

    Ok(DistributorNames {
        running,
        activatable,
    })
}

pub(super) async fn list_distributors(connection: &Connection) -> Result<Vec<String>, String> {
    Ok(discover_distributors(connection).await?.all())
}

fn choose_from_distributors(
    distributors: &DistributorNames,
    preferred: Option<&str>,
) -> Result<String, String> {
    if distributors.running.is_empty() && distributors.activatable.is_empty() {
        return Err("No UnifiedPush distributor is available".into());
    }

    if let Some(preferred) = preferred {
        if preferred.starts_with(DISTRIBUTOR_PREFIX) && distributors.contains(preferred) {
            return Ok(preferred.to_string());
        }
    }

    distributors
        .running
        .first()
        .or_else(|| distributors.activatable.first())
        .cloned()
        .ok_or_else(|| "No UnifiedPush distributor is available".into())
}

pub(super) async fn choose_distributor(connection: &Connection) -> Result<String, String> {
    let distributors = discover_distributors(connection).await?;
    choose_from_distributors(
        &distributors,
        std::env::var("UNIFIEDPUSH_DISTRIBUTOR").ok().as_deref(),
    )
}

pub(super) async fn resolve_distributor(
    connection: &Connection,
    distributor: Option<&str>,
) -> Result<String, String> {
    let Some(distributor) = distributor else {
        return choose_distributor(connection).await;
    };

    if !distributor.starts_with(DISTRIBUTOR_PREFIX) {
        return Err("UnifiedPush distributor is invalid".into());
    }

    let distributors = discover_distributors(connection).await?;
    if distributors.contains(distributor) {
        Ok(distributor.to_string())
    } else {
        Err("UnifiedPush distributor is not available".into())
    }
}

#[cfg(test)]
mod tests {
    use super::{choose_from_distributors, DistributorNames};

    fn names(running: &[&str], activatable: &[&str]) -> DistributorNames {
        DistributorNames {
            running: running.iter().map(|name| (*name).to_string()).collect(),
            activatable: activatable.iter().map(|name| (*name).to_string()).collect(),
        }
    }

    #[test]
    fn prefers_running_distributor_over_earlier_activatable_name() {
        let distributors = names(
            &["org.unifiedpush.Distributor.zzz"],
            &["org.unifiedpush.Distributor.aaa"],
        );

        assert_eq!(
            choose_from_distributors(&distributors, None).unwrap(),
            "org.unifiedpush.Distributor.zzz"
        );
    }

    #[test]
    fn respects_preferred_activatable_distributor() {
        let distributors = names(
            &["org.unifiedpush.Distributor.running"],
            &["org.unifiedpush.Distributor.preferred"],
        );

        assert_eq!(
            choose_from_distributors(&distributors, Some("org.unifiedpush.Distributor.preferred"))
                .unwrap(),
            "org.unifiedpush.Distributor.preferred"
        );
    }

    #[test]
    fn ignores_unavailable_preferred_distributor() {
        let distributors = names(
            &["org.unifiedpush.Distributor.running"],
            &["org.unifiedpush.Distributor.activatable"],
        );

        assert_eq!(
            choose_from_distributors(&distributors, Some("org.unifiedpush.Distributor.missing"))
                .unwrap(),
            "org.unifiedpush.Distributor.running"
        );
    }
}
