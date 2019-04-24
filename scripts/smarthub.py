import sys
import socket
import os
import errno
from time import sleep

hub20x20 = {};
hub20x20['address'] = '192.168.10.150'
hub20x20['port'] = 9990

hub20x20_cave = {};
hub20x20_cave['address'] = '130.194.253.166'
hub20x20_cave['port'] = 9990

hub40x40 = {};
hub40x40['address'] = '130.194.252.150'
hub40x40['port'] = 9990


hubs = {}
hubs['20x20'] = hub20x20
hubs['40x40'] = hub40x40
hubs['20x20_cave']=hub20x20_cave


def commandFromFile(hub, cmd):
    filename = 'cmds/' + hub + '/' + cmd + '.txt'
    str = ''
    with open(filename, 'rt') as f_in:
        for line in f_in:
            if len(line) > 0:
                str = str + line
    
    if(len(str.strip()) == 0):
        print 'ERROR: cannot load command'
        sys.exit(1)
        
    # add end of command
    str = str + '\n\n'
    return str


def numEmptyLines(str):
    arr = str.split('\n')
    count = 0
    prevlen = -1
    for a in arr:
        a = a.strip()
        if len(a) == 0 and prevlen !=0:
            count += 1
        prevlen = len(a)
    return count


def receiveMessage(s, maxblocks=1):
    '''
    receive a msg from socket s
    '''
    ret_msg = ''
    blockcount = 0
    while True:
        try:
            msg = s.recv(4096)
        except socket.timeout, e:
            err = e.args[0]
            # this next if/else is a bit redundant, but illustrates how the
            # timeout exception is setup
            if err == 'timed out':
                #sleep(1)
                print 'recv timed out, retry later'
                break
            else:
                print e
                sys.exit(1)
        except socket.error, e:
            # Something else happened, handle error, exit, etc.
            print e
            sys.exit(1)
        else:
            if len(msg) == 0:
                print 'orderly shutdown on server end'
                sys.exit(0)
            else:
                # got a message do something
                #print msg
                ret_msg = ret_msg + msg
                blockcount += numEmptyLines(msg)
                if blockcount >= maxblocks:
                    break

    return ret_msg


def runCommand(hub, cmd = ''):
    '''
    connect and send a command
    '''
    h = hubs[hub]
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.connect((h['address'], h['port']))
    s.settimeout(2);
    
    retmsg = ''
    
    msg = receiveMessage(s, 8)
    
    if cmd == '':
        retmsg += msg
    else:
        print 'COMMAND:\n', cmd
        s.send(cmd)
        msg = receiveMessage(s)
        retmsg += msg
    
    s.close()
    return retmsg
    
    
    
def usage():
    print 'Send a command to target video hub'
    print sys.argv[0] + ' [command] [hub]'
    print '  command: check cmds folder for available commands. Defaults to empty string'
    print '  hub: 40x40 (default) or 20x20. If hub is specified, command '
    
    
# ==== MAIN ====     
print sys.argv
if len(sys.argv) > 3:
    usage()
    sys.exit(0)

cmd = ''
hub = '40x40'
if len(sys.argv) > 1:
    cmd = sys.argv[1]
if len(sys.argv) == 3:
    hub = sys.argv[2]
print cmd, hub

if cmd != '':
    cmd = commandFromFile(hub, cmd)
msg = runCommand(hub, cmd)
print msg

print 'DONE!'

