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

#include "NvCtrlAttributes.h"
#include "NvCtrlAttributesPrivate.h"

#include "NVCtrlLib.h"

#include <stdlib.h>
#include <stdio.h>
#include <string.h>

/*
 * NvCtrlInitNvControlAttributes() - check for the NV-CONTROL
 * extension and make sure we have an adequate version.  Returns a
 * malloced and initialized NvCtrlNvControlAttributes structure if
 * successful, or NULL otherwise.
 */

NvCtrlNvControlAttributes *
NvCtrlInitNvControlAttributes (NvCtrlAttributePrivateHandle *h)
{
    NvCtrlNvControlAttributes *nv;
    int ret, major, minor, event, error;
    
    ret = XNVCTRLQueryExtension (h->dpy, &event, &error);
    if (ret != True) {
        fprintf(stderr, "NV-CONTROL extension not found on this Display.");
        return NULL;
    }
    
    ret = XNVCTRLQueryVersion (h->dpy, &major, &minor);
    if (ret != True) {
        fprintf(stderr, "Failed to query NV-CONTROL extension version.");
        return NULL;
    }

    if (major < NV_MINMAJOR || (major == NV_MINMAJOR && minor < NV_MINMINOR)) {
        fprintf(stderr, "NV-CONTROL extension version %d.%d is too old; "
                     "the minimimum required version is %d.%d.",
                     major, minor, NV_MINMAJOR, NV_MINMINOR);
        return NULL;
    }
    
    if (h->target_type == NV_CTRL_TARGET_TYPE_X_SCREEN) {
        ret = XNVCTRLIsNvScreen (h->dpy, h->target_id);
        if (ret != True) {
            fprintf(stderr, "NV-CONTROL extension not present on screen %d "
                           "of this Display.", h->target_id);
            return NULL;
        }
    }
    
    nv = (NvCtrlNvControlAttributes *)
        calloc(1, sizeof (NvCtrlNvControlAttributes));

    ret = XNVCtrlSelectTargetNotify(h->dpy, h->target_type, h->target_id,
                                    TARGET_ATTRIBUTE_CHANGED_EVENT, True);
    if (ret != True) {
        fprintf(stderr, "Unable to select attribute changed NV-CONTROL "
                       "events.");
    }

    /*
     * TARGET_ATTRIBUTE_AVAILABILITY_CHANGED_EVENT was added in NV-CONTROL
     * 1.15
     */

    if (((major > 1) || ((major == 1) && (minor >= 15)))) {
        ret = XNVCtrlSelectTargetNotify(h->dpy, h->target_type, h->target_id,
                                        TARGET_ATTRIBUTE_AVAILABILITY_CHANGED_EVENT,
                                        True);
        if (ret != True) {
            fprintf(stderr, "Unable to select attribute changed NV-CONTROL "
                           "events.");
        }
    }
    
    /*
     * TARGET_STRING_ATTRIBUTE_CHANGED_EVENT was added in NV-CONTROL
     * 1.16
     */
    
    if (((major > 1) || ((major == 1) && (minor >= 16)))) {
        ret = XNVCtrlSelectTargetNotify(h->dpy, h->target_type, h->target_id,
                                        TARGET_STRING_ATTRIBUTE_CHANGED_EVENT,
                                        True);
        if (ret != True) {
            fprintf(stderr, "Unable to select attribute changed NV-CONTROL string"
                           "events.");
        }
    }

    /*
     * TARGET_BINARY_ATTRIBUTE_CHANGED_EVENT was added in NV-CONTROL
     * 1.17
     */
    if (((major > 1) || ((major == 1) && (minor >= 17)))) {
        ret = XNVCtrlSelectTargetNotify(h->dpy, h->target_type, h->target_id,
                                        TARGET_BINARY_ATTRIBUTE_CHANGED_EVENT,
                                        True);
        if (ret != True) {
            fprintf(stderr, "Unable to select attribute changed NV-CONTROL binary"
                           "events.");
        }
    }

    nv->event_base = event;
    nv->error_base = error;
    nv->major_version = major;
    nv->minor_version = minor;

    return (nv);

} /* NvCtrlInitNvControlAttributes() */


ReturnStatus NvCtrlNvControlQueryTargetCount(NvCtrlAttributePrivateHandle *h,
                                             int target_type, int *val)
{
    int ret;

    ret = XNVCTRLQueryTargetCount(h->dpy, target_type, val);
    return (ret) ? NvCtrlSuccess : NvCtrlError;

} /* NvCtrlNvControlQueryTargetCount() */


ReturnStatus NvCtrlNvControlGetAttribute (NvCtrlAttributePrivateHandle *h,
                                          unsigned int display_mask,
                                          int attr, int *val)
{
    if (attr <= NV_CTRL_LAST_ATTRIBUTE) {
        if (XNVCTRLQueryTargetAttribute (h->dpy, h->target_type, h->target_id,
                                         display_mask, attr, val)) {
            return NvCtrlSuccess;
        } else {
            return NvCtrlAttributeNotAvailable;
        }
    }

    if ((attr >= NV_CTRL_ATTR_NV_BASE) &&
        (attr <= NV_CTRL_ATTR_NV_LAST_ATTRIBUTE)) {

        if (!h->nv) return NvCtrlMissingExtension;

        switch (attr) {
        case NV_CTRL_ATTR_NV_MAJOR_VERSION:
            *val = h->nv->major_version;
            return NvCtrlSuccess;
        case NV_CTRL_ATTR_NV_MINOR_VERSION:
            *val = h->nv->minor_version;
            return NvCtrlSuccess;
        }
    }

    return NvCtrlNoAttribute;
    
} /* NvCtrlNvControlGetAttribute() */


ReturnStatus NvCtrlNvControlSetAttribute (NvCtrlAttributePrivateHandle *h,
                                          unsigned int display_mask,
                                          int attr, int val)
{
    if (attr <= NV_CTRL_LAST_ATTRIBUTE) {
        XNVCTRLSetTargetAttribute (h->dpy, h->target_type, h->target_id,
                                   display_mask, attr, val);
        XFlush (h->dpy);
        return NvCtrlSuccess;
    }
      
    return NvCtrlNoAttribute;

} /* NvCtrlNvControlSetAttribute() */


ReturnStatus
NvCtrlNvControlSetAttributeWithReply(NvCtrlAttributePrivateHandle *h,
                                     unsigned int display_mask,
                                     int attr, int val)
{
    Bool bRet;

    /* XNVCTRLSetAttributeAndGetStatus() only works on X screens */
    
    if (h->target_type != NV_CTRL_TARGET_TYPE_X_SCREEN) {
        return NvCtrlError;
    }

    if (attr <= NV_CTRL_LAST_ATTRIBUTE) {
        bRet = XNVCTRLSetAttributeAndGetStatus(h->dpy, h->target_id,
                                               display_mask, attr, val);
        if (bRet) {
            return NvCtrlSuccess;
        } else {
            return NvCtrlError;
        }
    }
    
    return NvCtrlNoAttribute;
    
} /* NvCtrlNvControlSetAttributeWithReply() */



ReturnStatus NvCtrlNvControlGetValidAttributeValues
                              (NvCtrlAttributePrivateHandle *h,
                               unsigned int display_mask,
                               int attr, NVCTRLAttributeValidValuesRec *val)
{
    if (attr <= NV_CTRL_LAST_ATTRIBUTE) {
        if (XNVCTRLQueryValidTargetAttributeValues (h->dpy, h->target_type,
                                                    h->target_id, display_mask,
                                                    attr, val)) {
            return NvCtrlSuccess;
        } else {
            return NvCtrlAttributeNotAvailable;
        }
    }

    return NvCtrlNoAttribute;

} /* NvCtrlNvControlGetValidAttributeValues() */


ReturnStatus
NvCtrlNvControlGetStringAttribute (NvCtrlAttributePrivateHandle *h,
                                   unsigned int display_mask,
                                   int attr, char **ptr)
{
    /* Validate */
    if (!h || !h->dpy) {
        return NvCtrlBadHandle;
    }
    
    if (attr == NV_CTRL_STRING_NV_CONTROL_VERSION) {
        char str[16];
        if (h->target_type != NV_CTRL_TARGET_TYPE_X_SCREEN) {
            return NvCtrlBadHandle;
        }
        sprintf(str, "%d.%d", h->nv->major_version, h->nv->minor_version);
        *ptr = strdup(str);
        return NvCtrlSuccess;
    }

    if (attr <= NV_CTRL_STRING_LAST_ATTRIBUTE) {
        if (XNVCTRLQueryTargetStringAttribute (h->dpy, h->target_type,
                                               h->target_id, display_mask,
                                               attr, ptr)) {
            return NvCtrlSuccess;
        } else {
            return NvCtrlAttributeNotAvailable;
        }
    }

    return NvCtrlNoAttribute;

} /* NvCtrlNvControlGetStringAttribute() */


ReturnStatus
NvCtrlNvControlSetStringAttribute (NvCtrlAttributePrivateHandle *h,
                                   unsigned int display_mask,
                                   int attr, char *ptr, int *ret)
{
    int tmp_int; /* Temp storage if ret is not specified */

    if (h->target_type != NV_CTRL_TARGET_TYPE_X_SCREEN) {
        return NvCtrlBadHandle;
    }

    if (attr <= NV_CTRL_LAST_ATTRIBUTE) {
        if ( !ret ) {
            ret = &tmp_int;
        }
        *ret =
            XNVCTRLSetStringAttribute (h->dpy, h->target_id, display_mask,
                                       attr, ptr);
        if ( *ret ) {
            return NvCtrlSuccess;
        } else {
            return NvCtrlAttributeNotAvailable;
        }
    }
      
    return NvCtrlNoAttribute;

} /* NvCtrlNvControlSetStringAttribute() */


ReturnStatus
NvCtrlNvControlGetBinaryAttribute(NvCtrlAttributePrivateHandle *h,
                                  unsigned int display_mask, int attr,
                                  unsigned char **data, int *len)
{
    Bool bret;
    
    if (!h->nv) return NvCtrlMissingExtension;
    
    /* the X_nvCtrlQueryBinaryData opcode was added in 1.7 */

    if ((h->nv->major_version < 1) ||
        ((h->nv->major_version == 1) && (h->nv->minor_version < 7))) {
        return NvCtrlNoAttribute;
    }
    
    bret = XNVCTRLQueryTargetBinaryData (h->dpy, h->target_type, h->target_id,
                                         display_mask, attr, data, len);
    if (!bret) {
        return NvCtrlError;
    } else {
        return NvCtrlSuccess;
    }
    
} /* NvCtrlNvControlGetBinaryAttribute() */


ReturnStatus
NvCtrlNvControlStringOperation(NvCtrlAttributePrivateHandle *h,
                               unsigned int display_mask, int attr,
                               char *ptrIn, char **ptrOut)
{
    if (attr <= NV_CTRL_STRING_OPERATION_LAST_ATTRIBUTE) {
        if (XNVCTRLStringOperation (h->dpy, h->target_type,
                                    h->target_id, display_mask,
                                    attr, ptrIn, ptrOut)) {
            return NvCtrlSuccess;
        } else {
            return NvCtrlAttributeNotAvailable;
        }
    }

    return NvCtrlNoAttribute;

} /* NvCtrlNvControlStringOperation() */


ReturnStatus
NvCtrlSetGvoColorConversion(NvCtrlAttributeHandle *handle,
                            float colorMatrix[3][3],
                            float colorOffset[3],
                            float colorScale[3])
{
    NvCtrlAttributePrivateHandle *h;

    if (!handle) return NvCtrlBadHandle;

    h = (NvCtrlAttributePrivateHandle *) handle;

    if (!h->nv) return NvCtrlMissingExtension;
    
    if (h->target_type != NV_CTRL_TARGET_TYPE_X_SCREEN) return NvCtrlBadHandle;
    
    XNVCTRLSetGvoColorConversion(h->dpy,
                                 h->target_id,
                                 colorMatrix,
                                 colorOffset,
                                 colorScale);
    
    return NvCtrlSuccess;
    
} /* NvCtrlNvControlSetGvoColorConversion() */


ReturnStatus
NvCtrlGetGvoColorConversion(NvCtrlAttributeHandle *handle,
                            float colorMatrix[3][3],
                            float colorOffset[3],
                            float colorScale[3])
{
    NvCtrlAttributePrivateHandle *h;
    Bool bRet;
    
    if (!handle) return NvCtrlBadHandle;

    h = (NvCtrlAttributePrivateHandle *) handle;

    if (!h->nv) return NvCtrlMissingExtension;
    
    if (h->target_type != NV_CTRL_TARGET_TYPE_X_SCREEN) return NvCtrlBadHandle;

    bRet = XNVCTRLQueryGvoColorConversion(h->dpy,
                                          h->target_id,
                                          colorMatrix,
                                          colorOffset,
                                          colorScale);
    if (!bRet) {
        return NvCtrlError;
    } else {
        return NvCtrlSuccess;
    }

} /* NvCtrlNvControlGetGvoColorConversion() */
