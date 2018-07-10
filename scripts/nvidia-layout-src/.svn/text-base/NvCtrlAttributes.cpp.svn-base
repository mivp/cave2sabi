/*
 * nvidia-settings: A tool for configuring the NVIDIA X driver on Unix
 * and Linux systems.
 *
 * Copyright (C) 2004 NVIDIA Corporation.
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of Version 2 of the GNU General Public
 * License as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See Version 2
 * of the GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the:
 *
 *           Free Software Foundation, Inc.
 *           59 Temple Place - Suite 330
 *           Boston, MA 02111-1307, USA
 *
 */

//sage-nvidia.cpp:(.text+0xa79): undefined reference to `NvCtrlGetAttribute(void*, int, int*)'
//sage-nvidia.cpp:(.text+0xb2f): undefined reference to `NvCtrlQueryTargetCount(void*, int, int*)'
//sage-nvidia.cpp:(.text+0xc40): undefined reference to `NvCtrlAttributeInit(_XDisplay*, int, int, unsigned int)'
//sage-nvidia.cpp:(.text+0xc92): undefined reference to `NvCtrlGetDisplayName(void*)'
//sage-nvidia.cpp:(.text+0xe94): undefined reference to `NvCtrlAttributesStrError(ReturnStatus)'


#include "NvCtrlAttributes.h"
#include "NvCtrlAttributesPrivate.h"

#include "NVCtrlLib.h"

//#include "msg.h"

//#include "parse.h"

#include <X11/extensions/xf86vmode.h>
#include <X11/extensions/Xvlib.h>
#include <stdlib.h>
#include <string.h>
#include <stdio.h>

#include <sys/utsname.h>



/*
 * NvCtrlAttributeInit() - XXX not sure how to handle errors
 */

NvCtrlAttributeHandle *NvCtrlAttributeInit(Display *dpy, int target_type,
                                           int target_id,
                                           unsigned int subsystems)
{
    NvCtrlAttributePrivateHandle *h = NULL;

    h = (NvCtrlAttributePrivateHandle*) calloc(1, sizeof (NvCtrlAttributePrivateHandle));
    if (!h) {
      fprintf(stderr, "Memory allocation failure!");
        goto failed;
    }

    /* initialize the display and screen to the parameter values */

    h->dpy = dpy;
    h->target_type = target_type;
    h->target_id = target_id;

    /* initialize the NV-CONTROL attributes; give up if this fails */

    if (subsystems & NV_CTRL_ATTRIBUTES_NV_CONTROL_SUBSYSTEM) {
        h->nv = NvCtrlInitNvControlAttributes(h);
        if (!h->nv) goto failed;
    }

    /*
     * initialize X Screen specific attributes for X Screen
     * target types.
     */

    if (target_type == NV_CTRL_TARGET_TYPE_X_SCREEN) {
        
    } /* X Screen target type attribute subsystems */
  
    return (NvCtrlAttributeHandle *) h;

 failed:
    if (h) free (h);
    return NULL;

} /* NvCtrlAttributeInit() */

/*
 * nv_standardize_screen_name() - standardize the X Display name, by
 * inserting the hostname (if necessary), and using the specified
 * screen number.  If 'screen' is -1, use the screen number already in
 * the string.  If 'screen' is -2, do not put a screen number in the
 * Display name.
 */

char *nv_standardize_screen_name(const char *orig, int screen)
{
    char *display_name, *screen_name, *colon, *dot, *tmp;
    struct utsname uname_buf;
    int len;

    /* get the string describing this display connection */

    if (!orig) return NULL;

    /* create a working copy */

    display_name = strdup(orig);
    if (!display_name) return NULL;

    /* skip past the host */

    colon = strchr(display_name, ':');
    if (!colon) return NULL;

    /* if no host is specified, prepend the local hostname */

    /* XXX should we try to catch "localhost"? */

    if (display_name == colon) {
        if (uname(&uname_buf) == 0) {
            len = strlen(display_name) + strlen(uname_buf.nodename) + 1;
            tmp = (char*)malloc(len);
            snprintf(tmp, len, "%s%s", uname_buf.nodename, display_name);
            free(display_name);
            display_name = tmp;
            colon = strchr(display_name, ':');
            if (!colon) return NULL;
        }
    }

    /*
     * if the screen parameter is -1, then extract the screen number,
     * either from the string or default to 0
     */

    if (screen == -1) {
        dot = strchr(colon, '.');
        if (dot) {
            screen = atoi(dot + 1);
        } else {
            screen = 0;
        }
    }

    /*
     * find the separation between the display and the screen; if we
     * find it, then truncate the string before the screen, so that we
     * can append the correct screen number.
     */

    dot = strchr(colon, '.');
    if (dot) *dot = '\0';

    /*
     * if the screen parameter is -2, then do not write out a screen
     * number.
     */

    if (screen == -2) {
        screen_name = display_name;
    } else {
        len = strlen(display_name) + 8;
        screen_name = (char*)malloc(len);
        snprintf(screen_name, len, "%s.%d", display_name, screen);
        free(display_name);
    }

    return (screen_name);

} /* nv_standardize_screen_name() */




/*
 * NvCtrlGetDisplayName() - return a string of the form:
 * 
 * [host]:[display].[screen]
 *
 * that describes the X screen associated with this
 * NvCtrlAttributeHandle.  This is done by getting the string that
 * describes the display connection, and then substituting the correct
 * screen number.  If no hostname is present in the display string,
 * uname.nodename is prepended.  Returns NULL if any error occors.
 */

char *NvCtrlGetDisplayName(NvCtrlAttributeHandle *handle)
{
    NvCtrlAttributePrivateHandle *h;
    char *display_name;
        
    if (!handle) return NULL;
    
    h = (NvCtrlAttributePrivateHandle *) handle;
    
    display_name = DisplayString(h->dpy);

    if (h->target_type != NV_CTRL_TARGET_TYPE_X_SCREEN) {
        /* Return the display name and # without a screen number */
        return nv_standardize_screen_name(display_name, -2);
    }
    
    return nv_standardize_screen_name(display_name, h->target_id);
    
} /* NvCtrlGetDisplayName() */


/*
 * NvCtrlDisplayPtr() - returns the Display pointer associated with
 * this NvCtrlAttributeHandle.
 */
  
Display *NvCtrlGetDisplayPtr(NvCtrlAttributeHandle *handle)
{
    NvCtrlAttributePrivateHandle *h;

    if (!handle) return NULL;

    h = (NvCtrlAttributePrivateHandle *) handle;
    
    return h->dpy;

} /* NvCtrlDisplayPtr() */


/*
 * NvCtrlGetScreen() - returns the screen number associated with this
 * NvCtrlAttributeHandle.
 */

int NvCtrlGetScreen(NvCtrlAttributeHandle *handle)
{
    NvCtrlAttributePrivateHandle *h;

    if (!handle) return -1;

    h = (NvCtrlAttributePrivateHandle *) handle;

    if (h->target_type != NV_CTRL_TARGET_TYPE_X_SCREEN) return -1;
    
    return h->target_id;

} /* NvCtrlGetScreen() */


/*
 * NvCtrlGetTargetType() - returns the target type associated with this
 * NvCtrlAttributeHandle.
 */

int NvCtrlGetTargetType(NvCtrlAttributeHandle *handle)
{
    NvCtrlAttributePrivateHandle *h;

    if (!handle) return -1;

    h = (NvCtrlAttributePrivateHandle *) handle;

    return h->target_type;

} /* NvCtrlGetTargetType() */


/*
 * NvCtrlGetTargetId() - returns the target id number associated with this
 * NvCtrlAttributeHandle.
 */

int NvCtrlGetTargetId(NvCtrlAttributeHandle *handle)
{
    NvCtrlAttributePrivateHandle *h;

    if (!handle) return -1;

    h = (NvCtrlAttributePrivateHandle *) handle;

    return h->target_id;

} /* NvCtrlGetTargetId() */


/*
 * NvCtrlGetScreenWidth() - return the width of the screen associated
 * with this NvCtrlAttributeHandle.
 */

int NvCtrlGetScreenWidth(NvCtrlAttributeHandle *handle)
{
    NvCtrlAttributePrivateHandle *h;

    if (!handle) return -1;

    h = (NvCtrlAttributePrivateHandle *) handle;

    if (h->target_type != NV_CTRL_TARGET_TYPE_X_SCREEN) return -1;

    return DisplayWidth(h->dpy, h->target_id);
    
} /* NvCtrlGetScreenWidth() */


/*
 * NvCtrlGetScreenHeight() - return the height of the screen
 * associated with this NvCtrlAttributeHandle.
 */

int NvCtrlGetScreenHeight(NvCtrlAttributeHandle *handle)
{
    NvCtrlAttributePrivateHandle *h;

    if (!handle) return -1;

    h = (NvCtrlAttributePrivateHandle *) handle;

    if (h->target_type != NV_CTRL_TARGET_TYPE_X_SCREEN) return -1;

    return DisplayHeight(h->dpy, h->target_id);
    
} /* NvCtrlGetScreenHeight() */


int NvCtrlGetEventBase(NvCtrlAttributeHandle *handle)
{
    NvCtrlAttributePrivateHandle *h;

    if (!handle) return -1;

    h = (NvCtrlAttributePrivateHandle *) handle;

    if (!h->nv) return -1;
    return (h->nv->event_base);
    
} /* NvCtrlGetEventBase() */




/*
 * NvCtrlGetServerVendor() - return the server vendor
 * information string associated with this
 * NvCtrlAttributeHandle.
 */

char *NvCtrlGetServerVendor(NvCtrlAttributeHandle *handle)
{
    NvCtrlAttributePrivateHandle *h;

    if (!handle) return NULL;

    h = (NvCtrlAttributePrivateHandle *) handle;

    if (!h->dpy) return NULL;
    return ServerVendor(h->dpy);

} /* NvCtrlGetServerVendor() */


/*
 * NvCtrlGetVendorRelease() - return the server vendor
 * release number associated with this NvCtrlAttributeHandle.
 */

int NvCtrlGetVendorRelease(NvCtrlAttributeHandle *handle)
{
    NvCtrlAttributePrivateHandle *h;

    if (!handle) return -1;

    h = (NvCtrlAttributePrivateHandle *) handle;

    if (!h->dpy) return -1;
    return VendorRelease(h->dpy);

} /* NvCtrlGetVendorRelease() */


/*
 * NvCtrlGetScreenCount() - return the number of (logical)
 * X Screens associated with this NvCtrlAttributeHandle.
 */

int NvCtrlGetScreenCount(NvCtrlAttributeHandle *handle)
{
    NvCtrlAttributePrivateHandle *h;

    if (!handle) return -1;

    h = (NvCtrlAttributePrivateHandle *) handle;

    if (!h->dpy) return -1;
    return ScreenCount(h->dpy);

} /* NvCtrlGetScreenCount() */


/*
 * NvCtrlGetProtocolVersion() - Returns the majoy version
 * number of the X protocol (server).
 */

int NvCtrlGetProtocolVersion(NvCtrlAttributeHandle *handle)
{
    NvCtrlAttributePrivateHandle *h;

    if (!handle) return -1;

    h = (NvCtrlAttributePrivateHandle *) handle;

    if (!h->dpy) return -1;
    return ProtocolVersion(h->dpy);

} /* NvCtrlGetProtocolVersion() */


/*
 * NvCtrlGetProtocolRevision() - Returns the revision number
 * of the X protocol (server).
 */

int NvCtrlGetProtocolRevision(NvCtrlAttributeHandle *handle)
{
    NvCtrlAttributePrivateHandle *h;

    if (!handle) return -1;

    h = (NvCtrlAttributePrivateHandle *) handle;

    if (!h->dpy) return -1;
    return ProtocolRevision(h->dpy);

} /* NvCtrlGetProtocolRevision() */


/*
 * NvCtrlGetScreenWidthMM() - return the width (in Millimeters) of the
 * screen associated with this NvCtrlAttributeHandle.
 */

int NvCtrlGetScreenWidthMM(NvCtrlAttributeHandle *handle)
{
    NvCtrlAttributePrivateHandle *h;

    if (!handle) return -1;

    h = (NvCtrlAttributePrivateHandle *) handle;

    if (h->target_type != NV_CTRL_TARGET_TYPE_X_SCREEN) return -1;

    return DisplayWidthMM(h->dpy, h->target_id);
    
} /* NvCtrlGetScreenWidthMM() */


/*
 * NvCtrlGetScreenHeightMM() - return the height (in Millimeters) of the
 * screen associated with this NvCtrlAttributeHandle.
 */

int NvCtrlGetScreenHeightMM(NvCtrlAttributeHandle *handle)
{
    NvCtrlAttributePrivateHandle *h;

    if (!handle) return -1;

    h = (NvCtrlAttributePrivateHandle *) handle;

    if (h->target_type != NV_CTRL_TARGET_TYPE_X_SCREEN) return -1;

    return DisplayHeightMM(h->dpy, h->target_id);
    
} /* NvCtrlGetScreenHeightMM() */


/*
 * NvCtrlGetScreenPlanes() - return the number of planes (the depth)
 * of the screen associated with this NvCtrlAttributeHandle.
 */

int NvCtrlGetScreenPlanes(NvCtrlAttributeHandle *handle)
{
    NvCtrlAttributePrivateHandle *h;

    if (!handle) return -1;

    h = (NvCtrlAttributePrivateHandle *) handle;

    if (h->target_type != NV_CTRL_TARGET_TYPE_X_SCREEN) return -1;

    return DisplayPlanes(h->dpy, h->target_id);
    
} /* NvCtrlGetScreenPlanes() */



ReturnStatus NvCtrlQueryTargetCount(NvCtrlAttributeHandle *handle,
                                    int target_type,
                                    int *val)
{
    NvCtrlAttributePrivateHandle *h;

    h = (NvCtrlAttributePrivateHandle *) handle;
    if (!h) return NvCtrlBadArgument;
    return NvCtrlNvControlQueryTargetCount((NvCtrlAttributePrivateHandle*)handle, target_type, val);

} /* NvCtrlQueryTargetCount() */

ReturnStatus NvCtrlGetAttribute(NvCtrlAttributeHandle *handle,
                                int attr, int *val)
{
    if (!handle) return NvCtrlBadArgument;
    return NvCtrlGetDisplayAttribute(handle, 0, attr, val);
    
} /* NvCtrlGetAttribute() */


ReturnStatus NvCtrlSetAttribute(NvCtrlAttributeHandle *handle,
                                int attr, int val)
{
    if (!handle) return NvCtrlBadArgument;
    return NvCtrlSetDisplayAttribute(handle, 0, attr, val);

} /* NvCtrlSetAttribute() */


ReturnStatus NvCtrlGetVoidAttribute(NvCtrlAttributeHandle *handle,
                                    int attr, void **ptr)
{
    if (!handle) return NvCtrlBadArgument;
    return NvCtrlGetVoidDisplayAttribute(handle, 0, attr, ptr);
    
} /* NvCtrlGetVoidAttribute() */


ReturnStatus NvCtrlGetValidAttributeValues(NvCtrlAttributeHandle *handle,
                                           int attr,
                                           NVCTRLAttributeValidValuesRec *val)
{
    if (!handle) return NvCtrlBadArgument;
    return NvCtrlGetValidDisplayAttributeValues(handle, 0, attr, val);
    
} /* NvCtrlGetValidAttributeValues() */


ReturnStatus NvCtrlGetStringAttribute(NvCtrlAttributeHandle *handle,
                                      int attr, char **ptr)
{
    if (!handle) return NvCtrlBadArgument;
    return NvCtrlGetStringDisplayAttribute(handle, 0, attr, ptr);

} /* NvCtrlGetStringAttribute() */


ReturnStatus NvCtrlSetStringAttribute(NvCtrlAttributeHandle *handle,
                                      int attr, char *ptr, int *ret)
{
    if (!handle) return NvCtrlBadArgument;
    return NvCtrlSetStringDisplayAttribute(handle, 0, attr, ptr, ret);

} /* NvCtrlSetStringAttribute() */


ReturnStatus
NvCtrlGetDisplayAttribute(NvCtrlAttributeHandle *handle,
                          unsigned int display_mask, int attr, int *val)
{
    NvCtrlAttributePrivateHandle *h;

    h = (NvCtrlAttributePrivateHandle *) handle;

    if ((attr >= NV_CTRL_ATTR_EXT_BASE) &&
        (attr <= NV_CTRL_ATTR_EXT_LAST_ATTRIBUTE)) {
        switch (attr) {
          case NV_CTRL_ATTR_EXT_NV_PRESENT:
            *val = (h->nv) ? True : False; break;
          case NV_CTRL_ATTR_EXT_VM_PRESENT:
            *val = (h->vm) ? True : False; break;
          case NV_CTRL_ATTR_EXT_XV_OVERLAY_PRESENT:
            *val = (h->xv && h->xv->overlay) ? True : False; break;
          case NV_CTRL_ATTR_EXT_XV_TEXTURE_PRESENT:
            *val = (h->xv && h->xv->texture) ? True : False; break;
          case NV_CTRL_ATTR_EXT_XV_BLITTER_PRESENT:
            *val = (h->xv && h->xv->blitter) ? True : False; break;
          default:
            return NvCtrlNoAttribute;
        }
        return NvCtrlSuccess;
    }
    
    if (((attr >= 0) && (attr <= NV_CTRL_LAST_ATTRIBUTE)) ||
        ((attr >= NV_CTRL_ATTR_NV_BASE) &&
         (attr <= NV_CTRL_ATTR_NV_LAST_ATTRIBUTE))) {
        if (!h->nv) return NvCtrlMissingExtension;
        return NvCtrlNvControlGetAttribute(h, display_mask, attr, val);
    }



    return NvCtrlNoAttribute;
    
} /* NvCtrlGetDisplayAttribute() */


ReturnStatus
NvCtrlSetDisplayAttribute(NvCtrlAttributeHandle *handle,
                          unsigned int display_mask, int attr, int val)
{
    NvCtrlAttributePrivateHandle *h;

    h = (NvCtrlAttributePrivateHandle *) handle;
    
    if ((attr >= 0) && (attr <= NV_CTRL_LAST_ATTRIBUTE)) {
        if (!h->nv) return NvCtrlMissingExtension;
        return NvCtrlNvControlSetAttribute(h, display_mask, attr, val);
    }


    return NvCtrlNoAttribute;

} /* NvCtrlSetDisplayAttribute() */


ReturnStatus
NvCtrlSetDisplayAttributeWithReply(NvCtrlAttributeHandle *handle,
                                   unsigned int display_mask,
                                   int attr, int val)
{
    NvCtrlAttributePrivateHandle *h;
    
    h = (NvCtrlAttributePrivateHandle *) handle;
    
    if ((attr >= 0) && (attr <= NV_CTRL_LAST_ATTRIBUTE)) {
        if (!h->nv) return NvCtrlMissingExtension;
        return NvCtrlNvControlSetAttributeWithReply(h, display_mask,
                                                    attr, val);
    }
    
    return NvCtrlNoAttribute;
}


ReturnStatus
NvCtrlGetVoidDisplayAttribute(NvCtrlAttributeHandle *handle,
                              unsigned int display_mask, int attr, void **ptr)
{
    NvCtrlAttributePrivateHandle *h;

    h = (NvCtrlAttributePrivateHandle *) handle;


    return NvCtrlNoAttribute;

} /* NvCtrlGetVoidDisplayAttribute() */


ReturnStatus
NvCtrlGetValidDisplayAttributeValues(NvCtrlAttributeHandle *handle,
                                     unsigned int display_mask, int attr,
                                     NVCTRLAttributeValidValuesRec *val)
{
    NvCtrlAttributePrivateHandle *h;
    
    h = (NvCtrlAttributePrivateHandle *) handle;
    
    if ((attr >= 0) && (attr <= NV_CTRL_LAST_ATTRIBUTE)) {
        if (!h->nv) return NvCtrlMissingExtension;
        return NvCtrlNvControlGetValidAttributeValues(h, display_mask,
                                                      attr, val);
    }

    
    return NvCtrlNoAttribute;
    
} /* NvCtrlGetValidDisplayAttributeValues() */


/*
 * NvCtrlGetValidStringDisplayAttributeValues() -fill the
 * NVCTRLAttributeValidValuesRec strucure for String atrributes
 */

ReturnStatus
NvCtrlGetValidStringDisplayAttributeValues(NvCtrlAttributeHandle *handle,
                                           unsigned int display_mask, int attr,
                                           NVCTRLAttributeValidValuesRec *val)
{
    NvCtrlAttributePrivateHandle *h;
    h = (NvCtrlAttributePrivateHandle *) handle;

    if (val) {
        memset(val, 0, sizeof(NVCTRLAttributeValidValuesRec));
        val->type = ATTRIBUTE_TYPE_UNKNOWN;
        val->permissions = ATTRIBUTE_TYPE_READ | ATTRIBUTE_TYPE_X_SCREEN;
        return NvCtrlSuccess;
    } else {
        return NvCtrlBadArgument;
    }

} /* NvCtrlGetValidStringDisplayAttributeValues() */


ReturnStatus
NvCtrlGetStringDisplayAttribute(NvCtrlAttributeHandle *handle,
                                unsigned int display_mask,
                                int attr, char **ptr)
{
    NvCtrlAttributePrivateHandle *h;

    h = (NvCtrlAttributePrivateHandle *) handle;

    if ((attr >= 0) && (attr <= NV_CTRL_STRING_LAST_ATTRIBUTE)) {
        if (!h->nv) return NvCtrlMissingExtension;
        return NvCtrlNvControlGetStringAttribute(h, display_mask, attr, ptr);
    }

    if ((attr >= NV_CTRL_STRING_NV_CONTROL_BASE) &&
        (attr <= NV_CTRL_STRING_NV_CONTROL_LAST_ATTRIBUTE)) {
        if (!h->nv) return NvCtrlMissingExtension;
        return NvCtrlNvControlGetStringAttribute(h, display_mask, attr, ptr);
    }




    return NvCtrlNoAttribute;

} /* NvCtrlGetStringDisplayAttribute() */


ReturnStatus
NvCtrlSetStringDisplayAttribute(NvCtrlAttributeHandle *handle,
                                unsigned int display_mask,
                                int attr, char *ptr, int *ret)
{
    NvCtrlAttributePrivateHandle *h;

    h = (NvCtrlAttributePrivateHandle *) handle;

    if ((attr >= 0) && (attr <= NV_CTRL_STRING_LAST_ATTRIBUTE)) {
        if (!h->nv) return NvCtrlMissingExtension;
        return NvCtrlNvControlSetStringAttribute(h, display_mask, attr,
                                                 ptr, ret);
    }

    return NvCtrlNoAttribute;

} /* NvCtrlSetStringDisplayAttribute() */


ReturnStatus
NvCtrlGetBinaryAttribute(NvCtrlAttributeHandle *handle,
                         unsigned int display_mask, int attr,
                         unsigned char **data, int *len)
{
    NvCtrlAttributePrivateHandle *h;
    
    h = (NvCtrlAttributePrivateHandle *) handle;

    return NvCtrlNvControlGetBinaryAttribute(h, display_mask, attr, data, len);

} /* NvCtrlGetBinaryAttribute() */


ReturnStatus
NvCtrlStringOperation(NvCtrlAttributeHandle *handle,
                      unsigned int display_mask, int attr,
                      char *ptrIn, char **ptrOut)
{
    NvCtrlAttributePrivateHandle *h;
    
    h = (NvCtrlAttributePrivateHandle *) handle;
    
    if ((attr >= 0) && (attr <= NV_CTRL_STRING_OPERATION_LAST_ATTRIBUTE)) {
        if (!h->nv) return NvCtrlMissingExtension;
        return NvCtrlNvControlStringOperation(h, display_mask, attr, ptrIn,
                                              ptrOut);
    }

    return NvCtrlNoAttribute;

} /* NvCtrlStringOperation() */


char *NvCtrlAttributesStrError(ReturnStatus status)
{
    switch (status) {
      case NvCtrlSuccess:
          return "Success"; break;
      case NvCtrlBadArgument:
          return "Bad argument"; break;
      case NvCtrlBadHandle:
          return "Bad handle"; break;
      case NvCtrlNoAttribute:
          return "No such attribute"; break;
      case NvCtrlMissingExtension:
          return "Missing Extension"; break;
      case NvCtrlReadOnlyAttribute:
          return "Read only attribute"; break;
      case NvCtrlWriteOnlyAttribute:
          return "Write only attribute"; break;
      case NvCtrlAttributeNotAvailable:
          return "Attribute not available"; break;
      case NvCtrlError: /* fall through to default */
      default:
        return "Unknown Error"; break;
    }
} /* NvCtrlAttributesStrError() */


void NvCtrlAttributeClose(NvCtrlAttributeHandle *handle)
{
    NvCtrlAttributePrivateHandle *h;
    
    if (!handle) return;
    
    h = (NvCtrlAttributePrivateHandle *) handle;


    free(h);
} /* NvCtrlAttributeClose() */



/*
 * NvCtrlGetMultisampleModeName() - lookup a string desribing the
 * NV-CONTROL constant.
*/

const char *NvCtrlGetMultisampleModeName(int multisample_mode)
{
    static const char *mode_names[] = {

        "Off",                 /* FSAA_MODE_NONE  */
        "2x (2xMS)",           /* FSAA_MODE_2x    */
        "2x Quincunx",         /* FSAA_MODE_2x_5t */
        "1.5 x 1.5",           /* FSAA_MODE_15x15 */
        "2 x 2 Supersampling", /* FSAA_MODE_2x2   */
        "4x (4xMS)",           /* FSAA_MODE_4x    */
        "4x, 9-tap Gaussian",  /* FSAA_MODE_4x_9t */
        "8x (4xMS, 4xCS)",     /* FSAA_MODE_8x    */
        "16x (4xMS, 12xCS)",   /* FSAA_MODE_16x   */
        "8x (4xSS, 2xMS)",     /* FSAA_MODE_8xS   */
        "8x (8xMS)",           /* FSAA_MODE_8xQ   */
        "16x (4xSS, 4xMS)",    /* FSAA_MODE_16xS  */
        "16x (8xMS, 8xCS)",    /* FSAA_MODE_16xQ  */
        "32x (4xSS, 8xMS)"     /* FSAA_MODE_32xS  */
    };

    if ((multisample_mode < NV_CTRL_FSAA_MODE_NONE) ||
        (multisample_mode > NV_CTRL_FSAA_MODE_MAX)) {
        return "Unknown Multisampling";
    }

    return mode_names[multisample_mode];

} /* NvCtrlGetMultisampleModeName  */
