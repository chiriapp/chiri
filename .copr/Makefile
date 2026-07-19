# Invoked by Copr's "make srpm" SCM build method in a networked mock chroot:
#   make -f <clone>/.copr/Makefile srpm outdir="<dir>" spec="<path>"
srpm:
	dnf install -y cargo git nodejs npm rpm-build
	bash scripts/make-srpm.sh "$(spec)" "$(outdir)"
