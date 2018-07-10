import time
import serial

ser = serial.Serial(
	port='/dev/ttyS0',
	baudrate=19200,
)

if not ser.isOpen():
	ser.open()
#ser.open()

#msg='KY A1 menu\r'
#msg='st a1 build.date?\r'
#msg='op ** pattern=red\r'
msg='op A1 slot.recall (0) \r'
#msg='op A1 display.power = 1 \r'

ser.write(msg)
ser.flush()

time.sleep(1)
out = ''
while ser.inWaiting() > 0:
	out += ser.read(1)

if out != '':
	print out

ser.close()

print 'Done'
