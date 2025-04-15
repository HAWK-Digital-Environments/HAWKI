
<div id="overlay"

@if($activeOverlay)
    style =" visibility: visible; opacity: 1;"
@else
    style ="visibility: hidden; opacity: 0;"
@endif
>
    <div id="overlay-wrapper">
        <div id="overlay-logo">
            <div class="center-text" style="padding-top: 50px;">
                <img src="{{url('xfel/xfel_logo.png')}}" alt="European XFEL">
                <h1>RAY - Reasoning Assistant for You</h1>
            </div>
        </div>  
    </div>
</div>

