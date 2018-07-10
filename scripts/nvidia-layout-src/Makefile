BUILD_OS := $(shell uname)
BUILD_ARCH := $(shell uname -m)


ifeq ($(BUILD_OS)-$(BUILD_ARCH),Linux-x86_64)
	X11R6_LIB_DIR = /usr/X11R6/lib64
else
	X11R6_LIB_DIR = /usr/X11R6/lib
endif

LIBXNVCTRL_DIR = libXNVCtrl

CXXFLAGS =  -Wno-write-strings  -I$(LIBXNVCTRL_DIR) -I.
LDFLAGS =  -L$(LIBXNVCTRL_DIR) -L$(X11R6_LIB_DIR)
LDLIBS =   -lXNVCtrl -lXext -lX11


SAMPLES = nvidia-layout

all: $(SAMPLES)

nvidia-layout: NvCtrlAttributes.o NvCtrlAttributesNvControl.o nvidia-layout.o
	$(CXX) -o nvidia-layout NvCtrlAttributes.o NvCtrlAttributesNvControl.o nvidia-layout.o $(LDFLAGS) $(LDLIBS)

clean:
	rm -rf *.o *~ $(SAMPLES)
