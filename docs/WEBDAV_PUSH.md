# WebDAV Push
WebDAV Push is a feature in Chiri that brings (near-)real-time synchronization for tasks. So, whenever a new task is added, an existing task is modified or deleted, Chiri will automatically sync itself for you.

Read more about WebDAV Push:
  - [GitHub Repository](https://github.com/bitfireAT/webdav-push/)
  - [Specification draft (HTML)](https://bitfireat.github.io/webdav-push/draft-bitfire-webdav-push-00.html)
  - [Specification draft (TXT)](https://bitfireat.github.io/webdav-push/draft-bitfire-webdav-push-00.txt)

There are, however, some limitations to this feature at the moment.

## Caveats
### Limited number of support
Only one other client, aside from Chiri, currently supports WebDAV Push. That being [DAVx⁵](https://www.davx5.com/) for Android. (when paired with another app like [jtx Board](https://jtx.techbee.at/))

As for servers, the [RustiCal](https://github.com/lennart-k/rustical/) CalDAV server implementation has WebDAV Push as a first-class citizen. There is also support for Nextcloud, but it requires you to install a [separate extension](https://github.com/bitfireAT/nc_ext_dav_push).

### Only task updates are handled
In addition to limited support, currently only task updates are tracked by the respective CalDAV servers above. 

This may change in the future, however, as the WebDAV Push specification allows for this use case.
