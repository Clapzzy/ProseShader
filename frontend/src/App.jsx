import { useEffect, useId, useRef, useState } from 'react'
import ghLogo from './assets/GitHub_Invertocat_Black.svg'
import axios from 'axios'

function App() {
  const [nextPage, setNextPage] = useState(false)
  const [preview, setPreview] = useState(null)
  const [textAreaValue, setTextAreaValue] = useState("")
  const imgInputRef = useRef(null)

  const alphaId = useId()
  const fontId = useId()
  const bgColorId = useId()
  const textId = useId()

  const alphaRef = useRef(null)
  const fontRef = useRef(null)
  const bgColorRef = useRef(null)
  const textRef = useRef(null)

  const [apiData, setData] = useState(null)
  const [isLoading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()

    const formData = new FormData(e.target)
    let alpha = formData.get("alpha")
    let fontSize = formData.get("fontSize")
    let text = formData.get("textInput")
    if (alpha > 255 || alpha < 0) {
      formData.set("alpha", 30)
    }
    if (fontSize > 32 || fontSize < 1) {
      formData.set("fontSize", 12)
    }
    if (text.length < 1 || text.length > 2500) {
      alert("Invalid poem entered!")
      return
    }

    //shouldnt be doing it like this
    let response = await axios.post("http://localhost:8080/shader", formData, {
      responseType: 'blob',
    })

    const url = URL.createObjectURL(response.data)

    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'filename.extension')
    document.body.appendChild(link)

    link.click()

    link.parentNode.removeChild(link)
    URL.revokeObjectURL(url)

  }

  const handleChange = (e) => {
    let file = e.target?.files?.[0]

    if (!file) {
      setPreview(null)
      return
    }

    if (file.type !== "image/png") {
      alert("Only PNG files allowed!")
      e.target.value = ""
      setPreview(null)
      return
    }

    let url = URL.createObjectURL(file)
    console.log("something")
    console.log(url)
    setPreview(url)
  }

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  // really scuffed, but i want it to be basic
  return (
    <div className='h-screen w-screen'>
      {!nextPage
        ? (
          <>
            <div className='relative z-20 h-full w-full flex flex-col justify-between'>
              <div className='w-full flex flex-col items-center mt-72'>
                <h1 className='font-semibold text-[64px] text-[#1A1A1A]'>
                  Verse Shader
                </h1>
                <h2 className='mt-0 font-medium text-[32px]'>
                  A pixel-poem renderer.
                </h2>
              </div>
              <div className='w-full flex flex-col gap-12 md:flex-row justify-between items-center mb-24 px-24'>
                <div className=''>
                  <h3 className='font-normal text-[32px] text-[#333333] leading-relaxed'>
                    A shader that transforms text into images —
                  </h3>
                  <h3 className='font-normal text-[32px] text-[#333333] leading-relaxed'>
                    one verse at a time.
                  </h3>
                </div>
                <div
                  className='px-7 py-2.5 bg-[#FFF7D6] rounded-xl shadow-md w-fit h-fit hover:shadow-2xl transition-shadow duration-300 ease-in-out cursor-pointer select-none active:shadow-md active:duration-75'
                  onClick={() => {
                    setNextPage(!nextPage)
                  }}
                >
                  <p className='text-[32px] font-extralight text-[#333333]'>
                    Try it out -&gt;
                  </p>
                </div>
              </div>
            </div>
            <div className="fixed inset-0 flex items-center justify-center w-full h-full blur-[300px] opacity-70 pointer-events-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-[#FFFFCC]"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-[#FFFFB2]"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[#FFFF99]"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-[#FFFF80]"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] rounded-full bg-[#FFFF66]"></div>
            </div>
          </>
        )
        : (
          <>
            <div className='w-8 h-8 mx-6 my-3 bg-[#FCF4CF] flex justify-center items-center rounded-full border-2 border-[#4C3A2C] text-yellow-950 text-xl shadow-xl hover:shadow-2xl transition-shadow duration-300 ease-in-out cursor-pointer select-none active:shadow-md active:duration-75'
              onClick={() => {
                setNextPage(false)
              }}
            >
              &lt;
            </div>
            <form
              onSubmit={handleSubmit}
              className='w-full overflow-visible flex flex-col md:flex-row justify-around py-32 px-16 gap-24'>
              <div className='relative md:w-1/2  '>
                <input
                  type='file'
                  ref={imgInputRef}
                  name='imageInput'
                  accept='.png,image/png'
                  onChange={handleChange}
                  placeholder='Select a .png image'
                  className='hidden'
                />
                <div
                  className={`md:sticky w-full bg-[#FCF4CF]  top-32 rounded-xl border-2 border-dashed border-[#4C3A2C] inset-shadow-sm inset-shadow-black/20 cursor-pointer ${preview ? 'hidden' : 'block'}`}
                  onClick={() => {
                    imgInputRef.current.click()
                  }}
                >
                  <div className='text-center my-4 mx-24'>
                    <p
                      className='font-medium italic text-xl text-gray-900'
                    >
                      Select a .png file
                    </p>
                  </div>
                </div>
                {preview && (
                  <div className='md:sticky top-32 '>
                    <img src={preview} alt='preview' className='w-full object-contain ' style={{ maxHeight: 'calc(100vh * 0.8)' }} />
                    <button
                      onClick={() => {
                        URL.revokeObjectURL(preview)
                        setPreview('')
                        imgInputRef.current.value = ''
                      }}
                      className='md:sticky bg-red-100 px-6 py-2 mt-3 rounded-md ring-2 ring-red-300 shadow-xl hover:shadow-2xl transition-shadow duration-300 ease-in-out cursor-pointer select-none active:shadow-md active:duration-75'
                    >
                      <p className='font-medium text-red-950'>
                        Remove
                      </p>
                    </button>
                  </div>
                )}
              </div>
              <div className="md:w-1/2 flex flex-col gap-9 h-1000">
                <h1 className='mb-3 text-4xl text-[#4C3A2C]/98 select-none'>
                  Shader Options :
                </h1>
                <div
                  className='cursor-text group opacity-90 focus-within:opacity-100 hover:opacity-100 transition-all duration-300'
                  onClick={() => {
                    alphaRef.current.focus()
                  }}
                >
                  <div className='flex flex-row justify-between'>
                    <label
                      htmlFor={alphaId}
                      className='mr-8 text-xl text-[#4C3A2C] select-none'
                    >
                      Background opacity
                    </label>
                    <input
                      className='px-6 text-xl  focus:outline-none focus:ring-0'
                      type='number'
                      max={255}
                      min={0}
                      defaultValue={30}
                      name='alpha'
                      ref={alphaRef}
                      id={alphaId}
                    />
                  </div>
                  <div className='h-0.5 w-full mt-1 rounded-full bg-[#FAEEB7] group-focus-within:bg-[#B5A269]! group-hover:bg-[#D9C68C] transition-colors'></div>
                </div>

                <div
                  className='cursor-text group opacity-90 focus-within:opacity-100 hover:opacity-100 transition-all duration-300'
                  onClick={() => {
                    fontRef.current.focus()
                  }}
                >
                  <div className='flex flex-row justify-between'>
                    <label
                      htmlFor={fontId}
                      className='mr-8 text-xl text-[#4C3A2C] select-none'
                    >
                      Font size
                    </label>
                    <input
                      className='px-6 text-xl  focus:outline-none focus:ring-0'
                      type='number'
                      max={32}
                      min={1}
                      defaultValue={12}
                      name='fontSize'
                      ref={fontRef}
                      id={fontId}
                    />
                  </div>
                  <div className='h-0.5 w-full mt-1 rounded-full bg-[#FAEEB7] group-focus-within:bg-[#B5A269]! group-hover:bg-[#D9C68C] transition-colors'></div>
                </div>

                <div
                  className='cursor-text group opacity-90 focus-within:opacity-100 hover:opacity-100 transition-all duration-300'
                  onClick={() => {
                    bgColorRef.current.focus()
                    bgColorRef.current.click()
                  }}
                >
                  <div className='flex flex-row justify-between'>
                    <label
                      htmlFor={fontId}
                      className='mr-8 text-xl text-[#4C3A2C] select-none'
                    >
                      Background color
                    </label>
                    <input
                      className='px-6 text-xl  focus:outline-none focus:ring-0 min-w-14 opacity-100!'
                      name='bgColor'
                      type='color'
                      id={bgColorId}
                      ref={bgColorRef}
                    />
                  </div>
                  <div className='h-0.5 w-full mt-1 rounded-full bg-[#FAEEB7] group-focus-within:bg-[#B5A269]! group-hover:bg-[#D9C68C] transition-colors'></div>
                </div>

                <div
                  className='flex flex-col gap-3 cursor-text opacity-80 focus-within:opacity-100 hover:opacity-100 transition-all duration-300'
                  onClick={() => {
                    textRef.current.focus()
                  }}
                >
                  <label
                    htmlFor={textId}
                    className='mr-8 text-xl text-[#4C3A2C] select-none'
                  >
                    Poem
                  </label>
                  <textarea
                    className='rounded-xl px-3 py-1.5 border-2 border-[#F9E99F] focus:border-[#B5A269]! hover:border-[#D9C68C] transition-all overflow-hidden resize-none focus:outline-none focus:ring-0 '
                    name='textInput'
                    type='text'
                    placeholder='Paste your poem here'
                    wrap={"soft"}
                    spellCheck={false}
                    ref={textRef}
                    id={textId}
                    onChange={() => {
                      textRef.current.style.height = 'auto'
                      textRef.current.style.height = `${textRef.current.scrollHeight}px`
                    }}
                    cols={10}
                  />
                </div>
                <input
                  type='submit'
                  value="Create image"
                  className='sticky bg-green-100 px-6 py-2 mt-3 text-green-950 rounded-md ring-2 ring-green-300 shadow-xl hover:shadow-2xl transition-shadow duration-300 ease-in-out cursor-pointer select-none active:shadow-md active:duration-75'
                />
              </div>
            </form>
          </>
        )
      }
    </div>
  )
}

export default App
