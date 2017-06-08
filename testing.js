
(async function() {

  var {test, page, dom, network, runtime, kill} = await require('.')()

  test('foo', async function() {
    var step_idx = 0
    var steps = [
      async function() {
        console.log(1)
        // type in forms, click buttons here
        await page.navigate({url: 'http://google.com/#q=a'})
      },
      async function() {
        console.log(2)
        // type in forms, click buttons here
        await page.navigate({url: 'http://google.com/#q=b'})
      },
      async function() {
        console.log(3)
        // type in forms, click buttons here
        await page.navigate({url: 'http://google.com/#q=c'})
      }
    ]

    page.loadEventFired(function() {
      if (step_idx === steps.length) {
        page.loadEventFired()
        return
      }
      steps[step_idx]()
      step_idx += 1
    })
    
    await page.navigate({url: 'http://google.com'})
  })

  test('bar', async function() {
    var step_idx = 0
    var steps = [
      async function() {
        console.log(4)
        await page.navigate({url: 'http://google.com/#q=d'})
      },
      async function() {
        console.log(5)
        await page.navigate({url: 'http://google.com/#q=e'})
      },
      async function() {
        console.log(6)
        await page.navigate({url: 'http://google.com/#q=f'})
      }
    ]

    page.loadEventFired(function() {
      if (step_idx === steps.length) {
        page.loadEventFired()
        return
      }
      steps[step_idx]()
      step_idx += 1
    })

    await page.navigate({url: 'http://google.com'})
  })

})()