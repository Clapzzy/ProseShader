package main

import (
	"bufio"
	"bytes"
	"compress/zlib"
	"encoding/binary"
	"fmt"
	"image"
	"image/color"
	"io"
	"math"
	"os"

	"github.com/fogleman/gg"
)

var pngSignature = [8]byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A}

type Row struct {
	Filter  byte
	RowData []byte
}

type Pixel struct {
	Red   byte
	Green byte
	Blue  byte
}

func abs(x int) int {
	if x < 0 {
		return -x
	}
	return x
}

var DecodeFilterFuncs = [5]func(byte, byte, byte, byte) byte{
	// 0
	func(x, a, b, c byte) byte {
		return x
	},
	// 1
	func(x, a, b, c byte) byte {
		return byte(int(x) + int(a))
	},
	// 2
	func(x, a, b, c byte) byte {
		return byte(int(x) + int(b))
	},

	// 3
	func(x, a, b, c byte) byte {
		return byte(int(x) + (int(a)+int(b))/2)
	},
	// 4
	func(x, a, b, c byte) byte {
		p := int(a) + int(b) - int(c)
		pa := abs(p - int(a))
		pb := abs(p - int(b))
		pc := abs(p - int(c))

		var pr int
		if pa <= pb && pa <= pc {
			pr = int(a)
		} else if pb <= pc {
			pr = int(b)
		} else {
			pr = int(c)
		}

		return byte(int(x) + pr)
	},
}

type PNGData struct {
	fileStream      *bufio.Reader
	Width           uint32
	Height          uint32
	BitDepth        byte
	ColorType       byte
	InterlaceMethod byte
	Idat            []byte
	InflatedPng     []Row
	UnfilteredPng   [][]Pixel
}

type PNGChunk struct {
	Length [4]byte
	Type   [4]byte
	Data   []byte
	CRC    [4]byte
}

// fucks up alpha
func (img *PNGData) unfilterData() {
	img.UnfilteredPng = make([][]Pixel, img.Height)
	for i := 0; i < int(img.Height); i++ {
		img.UnfilteredPng[i] = make([]Pixel, img.Width)
	}

	pixelBytes := 3
	if int(img.ColorType) == 6 {
		pixelBytes = 4
	}
	for i := 0; i < int(img.Height); i++ {
		for j := 0; j < int(img.Width); j++ {
			var ar, ag, ab byte
			var br, bg, bb byte
			var cr, cg, cb byte
			x := img.InflatedPng[i].RowData[j*pixelBytes : (j+1)*pixelBytes]
			if j > 0 {
				p := img.UnfilteredPng[i][j-1]
				ar, ag, ab = p.Red, p.Green, p.Blue
			}
			if i > 0 {
				p := img.UnfilteredPng[i-1][j]
				br, bg, bb = p.Red, p.Green, p.Blue
			}
			if i > 0 && j > 0 {
				p := img.UnfilteredPng[i-1][j-1]
				cr, cg, cb = p.Red, p.Green, p.Blue
			}

			redByte := DecodeFilterFuncs[(img.InflatedPng[i].Filter)](x[0], ar, br, cr)
			greenByte := DecodeFilterFuncs[(img.InflatedPng[i].Filter)](x[1], ag, bg, cg)
			blueByte := DecodeFilterFuncs[(img.InflatedPng[i].Filter)](x[2], ab, bb, cb)

			img.UnfilteredPng[i][j].Red = redByte
			img.UnfilteredPng[i][j].Green = greenByte
			img.UnfilteredPng[i][j].Blue = blueByte

		}

	}
}

func (img *PNGData) inflateIdat() {
	img.InflatedPng = make([]Row, img.Height)
	r, err := zlib.NewReader(bytes.NewReader(img.Idat))
	checkErr(err)
	defer r.Close()

	var outBytes bytes.Buffer
	_, err = io.Copy(&outBytes, r)
	checkErr(err)

	pixelBytes := 3
	if int(img.ColorType) == 6 {
		pixelBytes = 4
	}

	rowSize := pixelBytes * int(img.Width)
	for i := 0; i < int(img.Height); i++ {
		filter := make([]byte, 1)
		_, err = outBytes.Read(filter)
		checkErr(err)
		img.InflatedPng[i].Filter = filter[0]

		img.InflatedPng[i].RowData = make([]byte, rowSize)
		_, err = outBytes.Read(img.InflatedPng[i].RowData)
		checkErr(err)
	}
}

func (img *PNGData) readChunk() (e error, end bool) {
	chunk := PNGChunk{}
	_, err := img.fileStream.Read(chunk.Length[:])
	checkErr(err)

	_, err = img.fileStream.Read(chunk.Type[:])
	checkErr(err)

	if string(chunk.Type[:]) == "PLTE" {
		return fmt.Errorf("not color palets supported"), true
	}

	if string(chunk.Type[:]) == "IEND" {
		return nil, true
	}

	if chunk.Type[0] >= 'a' && chunk.Type[0] <= 'z' {
		_, err = io.CopyN(io.Discard, img.fileStream, int64(binary.BigEndian.Uint32(chunk.Length[:]))+4)
		fmt.Println("Put the fries in the bag")
		checkErr(err)
		return nil, false
	}

	data := make([]byte, int64(binary.BigEndian.Uint32(chunk.Length[:])))
	_, err = io.ReadFull(img.fileStream, data)
	checkErr(err)
	img.Idat = append(img.Idat, data...)

	_, err = io.CopyN(io.Discard, img.fileStream, 4)
	checkErr(err)

	return nil, false
}

func (img *PNGData) scaleDown(cursorSize int) {
	//may remove a few pixels
	newWidth := int(math.Floor(float64(img.Width / uint32(cursorSize))))
	newHeight := int(math.Floor(float64(img.Height / uint32(cursorSize))))
	newPng := make([][]Pixel, newHeight)
	fmt.Println(newHeight)
	fmt.Println(newWidth)
	for i := range newPng {
		newPng[i] = make([]Pixel, newWidth)
	}
	var avgR, avgG, avgB int
	currentPixelX := 0
	currentPixelY := 0
	for i := range newHeight {
		currentPixelY = i * cursorSize
		for j := range newWidth {
			currentPixelX = j * cursorSize
			for y := range cursorSize {
				for x := range cursorSize {
					avgR += int(img.UnfilteredPng[currentPixelY+y][currentPixelX+x].Red)
					avgG += int(img.UnfilteredPng[currentPixelY+y][currentPixelX+x].Green)
					avgB += int(img.UnfilteredPng[currentPixelY+y][currentPixelX+x].Blue)
				}
			}
			avgR = avgR / (cursorSize * cursorSize)
			avgG = avgG / (cursorSize * cursorSize)
			avgB = avgB / (cursorSize * cursorSize)
			newPng[i][j] = Pixel{
				Red:   byte(avgR),
				Green: byte(avgG),
				Blue:  byte(avgB),
			}
		}
	}

	img.Width = uint32(newWidth)
	img.Height = uint32(newHeight)
	img.UnfilteredPng = newPng
}

func checkErr(err error) {
	if err != nil {

		panic(err)
	}
}

func main() {

	f, err := os.Open("./smt.png")
	checkErr(err)
	defer f.Close()

	var img = PNGData{}

	img.fileStream = bufio.NewReader(f)
	header := make([]byte, 8)
	_, err = img.fileStream.Read(header)
	checkErr(err)

	if !bytes.Equal(header, pngSignature[:]) {
		panic("Hello")
	}

	lenType := make([]byte, 8)
	_, err = img.fileStream.Read(lenType)
	checkErr(err)

	if string(lenType[4:8]) != "IHDR" && binary.BigEndian.Uint32(lenType[0:4]) != 13 {
		panic("invalid ihdr")
	}

	dataIdhr := make([]byte, 17)
	_, err = img.fileStream.Read(dataIdhr)
	checkErr(err)

	img.Width = binary.BigEndian.Uint32(dataIdhr[0:4])
	img.Height = binary.BigEndian.Uint32(dataIdhr[4:8])
	img.BitDepth = dataIdhr[8]
	img.ColorType = dataIdhr[9]
	img.InterlaceMethod = dataIdhr[12]

	if int(img.ColorType) != 6 && int(img.ColorType) != 2 {
		fmt.Println(img.ColorType)
		panic("Color type not supported!")
	}
	if img.BitDepth != 8 {
		panic("only 1 byte per channel !")
	}
	fmt.Println("is Png")
	fmt.Println(img.BitDepth)
	fmt.Println(img.Width)
	fmt.Println(img.Height)

	for {
		err, isEnd := img.readChunk()
		if err != nil {
			panic("error while reading chunks ")
		}

		if isEnd {
			break
		}
	}

	img.inflateIdat()
	img.unfilterData()
	img.scaleDown(8)

	pngImg := image.NewRGBA(image.Rect(0, 0, int(img.Width), int(img.Height)))

	for y := 0; y < int(img.Height); y++ {
		for x := 0; x < int(img.Width); x++ {
			p := &img.UnfilteredPng[y][x]
			pngImg.SetRGBA(x, y, color.RGBA{
				R: p.Red,
				G: p.Green,
				B: p.Blue,
				A: 255,
			})
		}
	}

	file, err := os.Create("output6.png")
	checkErr(err)
	defer file.Close()

	newImage := gg.NewContextForRGBA(pngImg)
	newImage.DrawCircle(10, 10, 10)
	newImage.SetRGBA(0, 0, 0, 255)
	newImage.Fill()
	newImage.SavePNG("helloHello.png")

	//http.HandleFunc("/", greet)
	//http.ListenAndServe(":8080", nil)
}
