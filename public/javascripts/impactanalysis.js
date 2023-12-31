let managedItems        = [];
let selectedManagedItem = {};
let bomViews            = [];
let bomItemsByStatus    = [];
let selectedURN         = '';
let relatedWorkspaces   = [];
let relatedItems        = [];


$(document).ready(function() {   

    $('#overlay').show();

    setUIEvents();
    getChangeOrderDetails();
    getManagedFields();
    getRelatedWorkspaces();
    getRelationships(function() {});

});


// UI functionality
function setUIEvents() {
     
    
    // Managed Items Selection
    $('#nav-actions').children().click(function() {
        // $('.nav-action').toggleClass('hidden');
        $('body').toggleClass('no-panel');
    })


    $('#tabs').children().click(function() {
        $(this).siblings().removeClass('selected');
        $(this).addClass('selected');
        $('.panel-content').hide();
        $('#'+ $(this).attr('tab-id')).show();
    });
    $('#tabs').children().first().click();

    $('.bar').click(function() {

        resetViewerSelection();

        if($(this).hasClass('selected')) {
            $(this).removeClass('selected');
            $('.bom-item').each(function() {
                $(this).show();
            });
        } else {
            $(this).addClass('selected');
            $(this).siblings().removeClass('selected');
            let filter = $(this).attr('data-filter');
            let partNumbers = [];
            $('.bom-item').each(function() {
                if($(this).hasClass(filter)) {
                    $(this).show(); 
                    partNumbers.push($(this).attr('data-part-number'));
                } else $(this).hide();
            });
            viewerSelectModels(partNumbers, true);
            setItemColorsInViewer();




            // viewerSetColors(partNumbers, color, fitToView)
        }

    });
    $('#apply-to-viewer').click(function() {
        setItemColorsInViewer();
    });


    $('#related-select-all').click(function() {
        $('.changed-item').addClass('selected');
    });

    $('#related-deselect-all').click(function() {
        $('.changed-item').removeClass('selected');
    });

    $('#related-add-selected').click(function() {
        addManagedItem(false);
    });

    $('#related-add-all').click(function() {
        addManagedItem(true);
    });


    // Header Actions
    $('#toggle-details').click(function() {
        $('body').toggleClass('no-details');
        setTimeout(function() { viewer.resize(); }, 250);
        // viewer.resize();
    });
    $('#toggle-comparison').click(function() {

        // document.getElementsByClassName('adsk-viewing-viewer')[0].style.height = '800px'
        // document.getElementsByClassName('adsk-viewing-viewer')[0].style.width = '1400px'
    
        $.get( '/plm/list-viewables', { 'wsId' : selectedManagedItem.wsId, 'dmsId' : selectedManagedItem.prev }, function(response) {
    
            console.log(response);
    
            if(response.data.length > 0) {
    
                for(viewable of response.data) {
    
                    let resourceName = viewable.resourceName;

                    console.log(resourceName);
    
                    if((resourceName.indexOf('.iam.dwf') > 0) || (resourceName.indexOf('.ipt.dwf') > 0)){
                        $.get( '/plm/get-viewable', { 'link' : viewable.selfLink } , function(response) {        
                            addToViewer(response.data);
                        });
                    }
    
                }
    
            }
    
        });



    });
    $('#toggle-viewer').click(function() {
        $('body').toggleClass('no-viewer');
        setTimeout(function() { viewer.resize(); }, 250);
    });
    $('#toggle-tabs').click(function() {
        $('body').toggleClass('no-tabs');
        setTimeout(function() { viewer.resize(); }, 250);
    });


    // Item Actions
    $('#item-save').click(function() {
        updateManagedItem();
    });
    $('#item-bookmark').click(function() {
        toggleBookmark($('#item-bookmark'), selectedManagedItem.dmsId);
    });
    $('#item-open').click(function() {
        openItemByURN(selectedManagedItem.urn);
    });


}
function reset() {
   
    $('#item').show();

    $('#viewer').hide();

    $('#tabs').children().removeClass('count-none');
    $('#tabs').children().removeClass('count-done');
    $('#tabs').children().addClass('count-work');
    $('#tabs').find('.counter').html('');


    // $('.counter.value').html('');
    // $(".counter").hide();
    // $(".loading").show();

    $('#bom-table').html('');
    $(".content-table").find('tbody').children().remove();
    $(".content-list").children().remove();

    $('#related-list').html(''  );

    $("#message").hide();
    
    $('#details-progress').show();
    $('#details-list').html('');
    $('#details-list-prev').html('');

    $('.bar').css('flex-grow', 0);
    
}
function getItemLink(title, urn, tag) {
    
    if(tag === null) tag = 'td';
    if(typeof tag === 'undefined') tag = 'td';

    let params  = urn.split(".");
    let wsId    = params[params.length - 2];
    let urnLink = urn;
        urnLink = urnLink.replace(/:/g, "%60");
        urnLink = urnLink.replace(/\./g, ",");
    
    let link = $("<a></a>");
        link.attr("target", "_blank");
        link.attr("href", "https://" + tenant + ".autodeskplm360.net/plm/workspaces/" + wsId + "/items/itemDetails?view=full&tab=details&mode=view&itemId=" + urnLink);
        link.html(title);
    
    let elemLink = $('<' + tag + '></' + tag + '>');
        elemLink.append(link);
    
    return elemLink;
                    
}
function getFieldItemLink(value) {
    
    let params  = value.urn.split(".");
    let wsId    = params[params.length - 2];
    let urnLink = value.urn;
        urnLink = urnLink.replace(/:/g, "%60");
    
    let link = $("<a></a>");
        link.css("display", "block");
        link.attr("target", "_blank");
        link.attr("href", "https://" + tenant + ".autodeskplm360.net/plm/workspaces/" + wsId + "/items/itemDetails?view=full&tab=details&mode=view&itemId=" + urnLink);
        link.html(value.title);
    
    return link;
                    
}
function setCounter(id, value, total) {

    let elemCounter = $('#' + id + '-counter');
    let count = elemCounter.html();

    if(typeof total === 'undefined') total = true;

    if((count !== '') && (count !== '-')) count = Number(count); else count = 0;

    if(!total) value += count;

    if(value > 0) {
        elemCounter.html(value);
        elemCounter.parent().removeClass('count-work');
        elemCounter.parent().removeClass('count-none');
        elemCounter.parent().addClass('count-done');
    } else {
        elemCounter.html('-');
        elemCounter.parent().removeClass('count-work');
        elemCounter.parent().removeClass('count-done');
        elemCounter.parent().addClass('count-none');
    }
    // elemCounter.siblings('.loading').hide();

    // if(value > 0) elemCounter.css('display', 'inline-block');
    // else elemCounter.siblings('.none').css('display', 'inline-block');

}


// Get report header
function getChangeOrderDetails() {
    
    $.get('/plm/details', { 'wsId' : wsId, 'dmsId' : dmsId}, function(response) {

        let description = getSectionFieldValue(response.data.sections, 'DESCRIPTION', '', '');
        let elem = $('<span></span>');
            elem.html(description);

        $('#header-description').append(elem.text());
        $('#header-descriptor').html(response.data.title);
        $('#overlay').hide();

    });    
}
function decodeHtml(html) {
    var txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
}


// Get columns of managed items tab of Change Order
function getManagedFields() {
    
    $.get('/plm/managed-fields', { 'wsId' : wsId }, function(response) {

        let elemFields = $('#item-change');

        for(field of response.data) {
            insertField(field, elemFields, true, false, null, true);
        }

    });
}


// Get managed items of Change Order
function getManagedItems() {
    
    $.get('/plm/manages', { 'dmsId' : dmsId, 'wsId' : wsId }, function(response) {

        $('#nav-counter').html(response.data.length);

        let isUpdate = $('.nav-item').length > 0;
        
        
        for(var i = 0; i < response.data.length; i++) {
            
            var affectedItem    = response.data[i];
            var itemData        = affectedItem.item.link.split('/');
            var transition      = (affectedItem.hasOwnProperty("targetTransition")) ? affectedItem.targetTransition.title : "- not defined -";
            let transitionLink  = (affectedItem.hasOwnProperty('targetTransition')) ? affectedItem.targetTransition.link : '';
            let revision        = "";
            let fromRelease     = (affectedItem.hasOwnProperty("fromRelease")) ? affectedItem.fromRelease : "";
            let toRelease       = (affectedItem.hasOwnProperty("toRelease")) ? affectedItem.toRelease : "";

            let add             = true;

            $('.nav-item').each(function() {
                if($(this).attr('data-urn') === affectedItem.item.urn) add = false;
            });


            if(add) {

                if(fromRelease !== "") {
                    revision = "from Rev " + fromRelease + " to Rev " + toRelease;    
                } else if(toRelease !== "") {
                    revision = "Release as Rev " + toRelease;           
                } else {
                    revision = " - not defined -"          
                }

                managedItems.push({
                    'urn'        : affectedItem.item.urn,
                    'affected'   : affectedItem.__self__,
                    'link'       : affectedItem.item.link,
                    'wsId'       : itemData[4],
                    'dmsId'      : itemData[6],
                    'fields'     : affectedItem.linkedFields,
                    'from'       : affectedItem.fromRelease,
                    'transition' : transitionLink,
                    'prev'       : null,
                    'prevLink'   : null
                });

                // var elem = $("<div></div>");
                //     elem.addClass("nav-item");
                //     elem.addClass("unread");
                //     // elem.attr('data-from-release', affectedItem.fromRelease);
                //     // elem.attr('data-from-link', '');
                //     elem.attr("data-urn", affectedItem.item.urn);
                //     // elem.attr("data-wsid", itemData[4]);
                //     // elem.attr("data-dmsid", itemData[6]);
                //     // elem.attr("data-link", affectedItem.item.link);
                //     elem.append("<div class='nav-item-header'>" + affectedItem.item.title + "</div>");
                
                // if(affectedItem.hasOwnProperty("transitions")) {
                //     elem.append("<div class='nav-item-detail'>Revision: " + revision + "</div>");
                //     elem.append("<div class='nav-item-detail'>Transition: " + transition + "</div>");                
                // }



                if(transition !== '- not defined -') transition += ' ' + revision

                let elemTile = genTile(affectedItem.item.link, affectedItem.item.urn, '', 'view_in_ar', affectedItem.item.title, transition);
                    elemTile.addClass('nav-item');
                    elemTile.appendTo("#nav-list").fadeIn();


                elemTile.click(function() {
                    selectManagedItem($(this));
                });
            }

        }

        $('#nav').show();
        
        if(!isUpdate) $('.nav-item').first().click();
        
    });  

}
function selectManagedItem(elemClicked) {

    elemClicked.addClass('selected');
    elemClicked.siblings().removeClass('selected');
    elemClicked.removeClass('unread');

    reset();
    
    $('#panel-header-main').html(elemClicked.find('.tile-title').html());

    selectedURN = elemClicked.attr('data-urn');

    for(managedItem of managedItems) {
        if(managedItem.urn === selectedURN) selectedManagedItem = managedItem;
    }

    getViewables();
    getChangeLog();
    setAffectedItemFields();
    getRootParents();
    getRelated();
    getImpactedRelationships();
    getChangeProcesses();
    getBookmarkStatus($('#item-bookmark'), selectedURN);

    if(selectedManagedItem.prev === null) {
        $.get('/plm/versions', { 'link' : selectedManagedItem.link }, function(response) {
            selectedManagedItem.prev = '';
            selectedManagedItem.prevLink = '';
            for(version of response.data.versions) {
                if(typeof version.version !== 'undefined') {
                    // console.log(version.version === $(this).attr('data-from-release'));
                    // console.log(version.version === selectedManagedItem.from);
                    // console.log(version.version );
                    // console.log(selectedManagedItem.from);
                    // console.log($(this).attr('data-from-release'));
                    if(version.version === selectedManagedItem.from) {
                        //$(this).attr('data-from-link', version.item.link);
                        selectedManagedItem.prev = version.item.link.split('/')[6];
                        selectedManagedItem.prevLink = version.item.link;
                    }
                }
            }
            getBOM();
            getAttachments();
            getItemDetails();
        });
    } else {
        getBOM();
        getAttachments();
        getItemDetails();
    }

}


// Get relationships
function getRelatedWorkspaces() {

    $.get('/plm/related-workspaces', { 'wsId' : wsId, 'view' : '10'}, function(response) {
        for(workspace of response.data) {
            relatedWorkspaces.push({
                'wsId' : workspace.link.split('/')[4],
                'title' : workspace.title
            });
        }
        getManagedItems();
    });

}
function getRelationships(callback) {

    relatedItems = [];

    $.get('/plm/relationships', { wsId : wsId, dmsId: dmsId}, function(response) {
        for(relationship of response.data) {
            relatedItems.push({
                'urn'           : relationship.item.urn,
                'link'          : relationship.__self__,
                'description'   : relationship.description
            });
        }
        callback();
    });

}



// Get viewables of selected Vault Item to init viewer
function getViewables() {

    $('#viewer').hide();

    $.get('/plm/list-viewables', { 'link' : selectedManagedItem.link }, function(response) {

        if(response.params.link !== selectedManagedItem.link) return;

        if(response.data.length > 0) {

            $('body').removeClass('no-viewer');
            $('#header-actions').show();

            let link = response.data[0].selfLink;

            $.get( '/plm/get-viewable', { 'link' : link } , function(response) {
                if(response.params.link !== link) return;
                $('#viewer').show();
                initViewer(response.data);
            });

        } else {

            $('body').addClass('no-viewer');
            // $('#header-actions').hide();

        }

    });

}
function initViewerDone() {
}
function onSelectionChanged(event) {}
function addToViewer(data) {

    // console.log(data);

    // if(index < documents.length) {
        
        // Autodesk.Viewing.Initializer({accessToken: accessToken}, function() {
            Autodesk.Viewing.Document.load('urn:' + data.urn, function(document) {

                // console.log(document);
                // console.log(document.getRoot());
                // // console.log(document.getPropertyDbPath());


                // console.log('aha');

                // var rootItem = document.getRootItem();
                // var geometryItems3d = Autodesk.Viewing.Document.getSubItemsWithProperties(
                //     rootItem, {
                //         'type': 'geometry',
                //         'role': '3d' },    
                //     true);
                
                // var pathCollection = [];
                
                // geometryItems3d.forEach((item)=>{
                //     pathCollection.push(document.getViewablePath(item));
                // });
                
                var loadOptions = {
                    keepCurrentModels : true,
                    // globalOffset: {x:0, y:0, z:0},
                    applyRefPoint: true,
                    // modelNameOverride: name,
                    applyScaling: 'mm'
                    // placementTransform: mat , 
                    // globalOffset:{x:0,y:0,z:0}
                    // sharedPropertyDbPath: document.getPropertyDbPath()
                };
                
                // var mat = new THREE.Matrix4();
                // viewer.loadModel(pathCollection[0], loadOptions, function() {
                //     loadNext();
                // });


                const rootItem = document.getRoot();
                const filter = { type: 'geometry', role: '3d' };
                const viewables = rootItem.search(filter);

                if (viewables.length === 0) {
                  return onLoadModelError('Document contains no viewables.');
                }

                const bubble = viewables[0];

                viewer.loadDocumentNode(document, bubble, loadOptions).then(modelDiff);

  



                
            });
        // });
        
    // }
}
function modelDiff() {

    var extensionConfig = {
        'mimeType' : 'application/vnd.autodesk.inventor.assembly',
        'primaryModels' : [viewer.getVisibleModels()[0]],
        'diffModels' : [viewer.getVisibleModels()[1]],
        // 'diffMode' : 'overlay',
        'diffMode' : 'sidebyside',
        'versionA' : '2',
        'versionB' : '1'
    }

    viewer.loadExtension('Autodesk.DiffTool', extensionConfig).then(function (res) {
        //window.DIFF_EXT = viewer.getExtension('Autodesk.DiffTool');
        //console.log(window.DIFF_EXT);
    }).catch(function (err) {
        console.log(err);
    });

} 




// [1] Display Change Log
function getChangeLog() {
    
    $.getJSON('/plm/logs', { 'link' : selectedManagedItem.link }, function(response) {
        
        if(response.params.link !== selectedManagedItem.link) return;

        let elemTable   = $('#logs-table').find('tbody');

        for(log of response.data) {
            
            let elemDesc = $('<td><table><tr><td>' + log.description + '</td></tr></table></td>');

            if(log.description === null) {

                elemDesc = $('<td></td>');

                if(log.details.length > 0) {

                    let elemChanges = $('<table></table>');
                    let elemChange = $('<tr></tr>');
                        elemChange.appendTo(elemChanges);
                        elemChange.append('<td>' + log.details[0].fieldName + ' changed from<td>');
                        elemChange.append('<td class="text"> ' + log.details[0].oldValue + '<td>');
                        elemChange.append('<td>to<td>');
                        elemChange.append('<td class="text"> ' + log.details[0].newValue + '<td>');

                    elemDesc.append(elemChanges);
                    
                }

            }

            let timeStamp = new Date(log.timeStamp);
                
            var elemRow = $('<tr></tr>');
                elemRow.append('<td class="tiny">' + timeStamp.toDateString() + '</td>');
                elemRow.append('<td class="tiny">' + log.user.title + '</td>');
                elemRow.append('<td class="tiny">' + log.action.shortName + '</td>');
                elemRow.append(elemDesc);
                elemRow.appendTo(elemTable);
                
        }
        
    });
    
}


// [2] Set managed items tab fields
function setAffectedItemFields() {

    clearAllFields('item-change');

    for(field of selectedManagedItem.fields) setFieldValue(field);

}
function updateManagedItem() {

    $('#overlay').show();

    for(managedItem of managedItems) {
        if(managedItem.urn === selectedURN) {
            
            let params = {
                'link' : managedItem.affected,
                'fields': [],
                'transition' : managedItem.transition
            }

            console.log(managedItem);

            $('#item-change .field-value').each(function() {
                params.fields.push({
                    '__self__' : $(this).attr('data-link'),
                    'value' : getFieldInternalValue($(this))
                });
                let newField = true;
                for(field of managedItem.fields) {
                    if(field.__self__ === $(this).attr('data-link')) {
                        field.value = $(this).val();
                        newField = false;
                    }
                }
                if(newField) {
                    managedItem.fields.push({
                        '__self__' : $(this).attr('data-link'),
                        'value' : $(this).val()
                    });
                }



            });

            console.log(managedItem);

            $.get('/plm/update-managed-item', params, function(response) {
                $('#overlay').hide();
            });

        }
    }

}


// [3] Get details of selected item
function getItemDetails() {



    // let promises = [
    //     $.get('/plm/sections', { 'wsId' : wsId }),
    //     $.get('/plm/fields', { 'wsId' : wsId }),
    //     $.get('/plm/details', { 'link' : link })
    // ];

    // Promise.all(promises).then(function(responses) {
    //     $.get('/plm/details', { 'link' : link }, function(response) {
    //         insertItemDetails(elemParent, responses[0].data, responses[1].data, responses[2].data, false, false, false);


    

    let promises = [ 
        $.get('/plm/sections', { 'wsId' : selectedManagedItem.wsId }), 
        $.get('/plm/fields'  , { 'wsId' : selectedManagedItem.wsId }), 
        $.get('/plm/details' , { 'link' : selectedManagedItem.link })
    ];
    
    if(selectedManagedItem.prevLink !== '') promises.push($.get('/plm/details', { 'link' : selectedManagedItem.prevLink }));

    Promise.all(promises).then(function(responses) {


        if(responses[2].params.link !== selectedManagedItem.link) return;


        // $('#panel-header-main').html(responses[2].data.title);

        let elemParent = $('#details-list');
            elemParent.html('');

        insertItemDetails(elemParent, responses[0].data, responses[1].data, responses[2].data, false, false, false);

        let elemParentPrev = $('#details-list-prev');
            elemParentPrev.html('');

        if(promises.length > 3) {


            insertItemDetails(elemParentPrev, responses[0].data, responses[1].data, responses[3].data, false, false, false);

            markItemDetailsChanges();

            elemParentPrev.html('');

            $('#details-progress').hide();

        }

    });


    // $.get('/plm/details', { 'link' : selectedManagedItem.link }, function(response) {

    //     if(response.params.link !== selectedManagedItem.link) return;

    //     $('#item-title').html(response.data.title);

    //     let elemList = $('#details-list');
    //         // elemList.children().hide();
    //         elemList.html('');
        
    //     for(section of response.data.sections) {
        
    //         var elemSection = $('<div></div>');
    //             elemSection.addClass('section');
    //             elemSection.appendTo(elemList);
            
    //         var elemSectionTitle = $('<div></div>');
    //             elemSectionTitle.addClass('section-title');
    //             elemSectionTitle.html(section.title);
    //             elemSectionTitle.appendTo(elemSection);
            
    //         var elemSectionContent = $('<div></div>');
    //             elemSectionContent.addClass('section-content');
    //             elemSectionContent.appendTo(elemSection);
        
    //         for(field of section.fields) {
            
    //             var elemField = $('<div></div>');
    //             var elemLabel = $('<div></div>');
    //             var elemValue = $('<div></div>');

    //             elemField.addClass('field');
    //             elemLabel.addClass('field-label');
    //             elemValue.addClass('field-value');
                
    //             let fieldValue  = field.value;
                
    //             if(fieldValue === null) {
    //                 elemValue.html('');
    //             } else if(typeof fieldValue === 'object' ) {
    //                 if(Array.isArray(fieldValue)) {
    //                     for(value of field.value) {
    //                         elemValue.append(getFieldItemLink(value));
    //                     }       
    //                 } else {
    //                      elemValue.append(getFieldItemLink(field.value));
    //                 }
    //             } else {
    //                 elemValue.html(decodeHtml(field.value));
    //             }
                
    //             elemLabel.html(field.title);

    //             elemField.append(elemLabel).append(elemValue);
    //             elemField.appendTo(elemSectionContent);
            
    //         }
    //     }
        
    // });
    
}
function markItemDetailsChanges() {

    $('#details-list').find('.field-value').each(function() {

        let fieldId     = $(this).attr('data-id');
        let fieldValue  = $(this).val();
        let elemField   = $(this).closest('.field');
        let className   = 'match';

        $('#details-list-prev').find('.field-value').each(function() {
            if($(this).attr('data-id') === fieldId) {
                if($(this).val() !== fieldValue) {
                    className = 'different';

                    let elemDiff = $('<div></div>');
                        elemDiff.addClass('field');
                        elemDiff.insertAfter(elemField);

                    let elemDiffLabel = $('<div></div>');
                        elemDiffLabel.addClass('field-label');
                        elemDiffLabel.appendTo(elemDiff);

                    $(this).appendTo(elemDiff).addClass('was');
                }
            }
        });

        elemField.addClass(className);


    });


}


// [4] Get Bill of Materials
function getBOM() {

    let proceed = true;

    $('.bom-view').each(function() {
        if($(this).attr('data-wsid') === selectedManagedItem.wsId) {
            $(this).show();
            if($(this).hasClass('selected')) {
                $(this).click();
                proceed = false;
            }
        } else {
            $(this).hide();
        }
    });

    if(proceed) {
        $('.bom-view').each(function() {
            if($(this).attr('data-wsid') === selectedManagedItem.wsId) {
                if(proceed) {
                    $(this).click();
                    proceed = false;
                }
            }
        });
    }

    if(proceed) {

        $.get( '/plm/bom-views-and-fields', { 'wsId' : selectedManagedItem.wsId }, function(response) {

            let totalViews = response.data.length;

            for(view of response.data) {

                bomViews.push({
                    'wsId'      : selectedManagedItem.wsId,
                    'id'        : view.id,
                    'link'      : view.__self__.link,
                    'name'      : view.name,
                    'default'   : view.isDefault,
                    'fields'    : []
                });

                let elemView = $('<div></div>');
                    elemView.attr('data-wsId', selectedManagedItem.wsId);
                    elemView.attr('data-link', view.link);
                    elemView.attr('data-viewId', view.id);
                    elemView.addClass('bom-view');
                    elemView.html(view.name);
                    elemView.appendTo($('#bom-views'));
                    elemView.click(function() {
                        selectBOMView($(this));

                    });

                if(isFirstView()) elemView.addClass('first');
                if(isLastView(totalViews)) elemView.addClass('last');

                if(view.isDefault === true) {
                    elemView.click();
                }

            };

        });

    }

}
function isFirstView() {
    
    let count = 0;

    for(bomView of bomViews) {
        if(bomView.wsId === selectedManagedItem.wsId) count++;
    }
    
    if(count === 1) return true;

    return false;

}
function isLastView(total) {
    
    let count = 0;

    for(bomView of bomViews) {
        if(bomView.wsId === selectedManagedItem.wsId) count++;
    }
    
    if(count === total) return true;

    return false;
    
}
function selectBOMView(elemClicked) {

    let bomViewId = Number(elemClicked.attr('data-viewId'));

    elemClicked.siblings('[data-wsId="' + selectedManagedItem.wsId + '"]').removeClass('selected');
    elemClicked.addClass('selected');

    for(bomView of bomViews) {

        if(bomView.id === bomViewId) {

            if(bomView.fields.length === 0) {

                $.get( '/plm/bom-view-fields', { 'link' : bomView.link }, function(response) {

                    for(bomViewDef of bomViews) {

                        if(response.params.link === bomViewDef.link) {

                            for(field of response.data) {
                                bomViewDef.fields.push({
                                    'name'          : field.name,
                                    'formulaField'  : field.formulaField,
                                    'displayOrder'  : field.displayOrder,
                                    'link'          : field.__self__.link,
                                    'fieldId'       : field.fieldId,
                                    'type'          : field.type.link,
                                    'formulaField'  : field.formulaField
                                }) 
                            }
                            bomViewDef.fields.sort(function(a, b){
                                var nameA=a.displayOrder, nameB=b.displayOrder
                                if (nameA < nameB) //sort string ascending
                                    return -1 
                                if (nameA > nameB)
                                    return 1
                                return 0 //default return value (no sorting)
                            });

                            continue;
                        }
                    }

                    let requestId = response.params.link.split('/')[8];
                    setBOMTable(requestId);

                });
            } else {

                setBOMTable(bomView.id);
            }

            break;

        }

    }

}
function setBOMTable(viewId) {
    
    let selectedManagedItem;
    let fields  = [];
    let columns = '';

    for(managedItem of managedItems) {
        if(managedItem.urn === selectedURN) selectedManagedItem = managedItem;
    }

    let params = {
        'wsId'          : selectedManagedItem.wsId,
        'dmsId'         : selectedManagedItem.dmsId,
        'revisionBias'  : 'changeOrder',
        'viewId'     : viewId
    }

    for(bomView of bomViews) {
        if(bomView.id === Number(viewId)) {
            fields = bomView.fields;
            for(field of bomView.fields) {
                columns += '<th>' + field.name + '</th>';
            }
            break;
        }
    }

    $.get( '/plm/bom-flat', params, function(response) {



        //if(data.bom.root.link.indexOf('/api/v3/workspaces/' + selectedManagedItem.wsId + '/items/' + selectedManagedItem.dmsId) < 0) return;
        if(response.params.dmsId !== params.dmsId) return;


        let counter     = 0;
        let elemTable   = $("#bom-table");

        elemTable.html('');

        for(item of response.data) {
            
            counter++;

            // let icon = (managedItems.indexOf(item.item.urn) < 0) ? '<i class="zmdi zmdi-minus-circle"></i>' : '<i class="zmdi zmdi-check-circle"></i>';
            let icon = (managedItems.indexOf(item.item.urn) < 0) ? '' : '<i class="zmdi zmdi-check-circle"></i>';
                
            // var elemRow = $("<tr></tr>");
            //     elemRow.append('<td class="bom-status"></td>');
            //     elemRow.append('<td>' + icon + '</td>');
            //     elemRow.append(getItemLink(item.item.title, item.item.urn));
            //     elemRow.append('<td>' + item.item.version + '</td>');
            //     elemRow.append('<td>' + item.totalQuantity + '</td>');
            //     elemRow.append('<td>' + item.occurrences.length + '</td>');

            //     for(field of fields) {
            //         let value = '';
            //         for(property of item.occurrences[0].fields) {
            //             if(property.metaData.link === field.link) {
            //                 value = property.value;
            //                 break;
            //             }
            //         }
            //         elemRow.append('<td>' + value + '</td>');
            //     }

            //     elemRow.appendTo(elemTable);
            //     elemRow.attr('data-title', item.item.title);
            //     elemRow.attr('data-link', item.item.link);
            //     elemRow.addClass('bom-item');

            let elemRow = genBOMItem(item, fields);

            elemRow.click(function() {

                if($(this).hasClass('selected')) {                          
                    resetViewerSelection(true);
                    $(this).removeClass('selected');
                } else {

                    let partNumber = $(this).attr('data-part-number');

                    viewerResetColors();
                    viewerSelectModel(partNumber, true);

                    $(this).siblings().removeClass('selected');
                    $(this).addClass('selected');
                    
                }

            });
                
        }
        
        // elemTable.prepend('<tr><th></th><th></th><th>Item</th><th>Rev</th><th>Quantity</th><th>Occurences</th>' + columns + '</tr>');
        elemTable.prepend('<tr><th></th><th></th>' + columns + '</tr>');
        
        setCounter("bom", counter);
        $('#overlay').hide();

        getBOMStatus(viewId, fields);

    });

}
function getBOMStatus(viewId, fields) {

    let params = {
        'wsId'          : selectedManagedItem.wsId,
        'dmsId'         : selectedManagedItem.prev,
        'revisionBias'  : 'release',
        'viewId'     : viewId
    }

    if((typeof selectedManagedItem.prev !== 'undefined') && (selectedManagedItem.prev !== '')) {

        $.get( '/plm/bom-flat', params, function(response) {
            // if(data.root.link.indexOf('/api/v3/workspaces/' + selectedManagedItem.wsId + '/items/' + selectedManagedItem.prev) < 0) return;
            if(response.params.dmsId !== params.dmsId) return;
            setBOMStatus(response.data, fields);
        });

    } else {
        setBOMStatus([], fields);
    }

}
function setBOMStatus(listPrevious, fields) {

    bomItemsByStatus = {
        'new'       : [],
        'additional': [],
        'different' : [],
        'match'     : [],
        'removed'   : []
    };

    $('td.bom-status').each(function() {

        let status          = '';
        let isAdditional    = true;
        let isDifferent     = false;
        let isNew           = false;
        let parent          = $(this).closest('tr');
        let link            = parent.attr('data-link');
        let partNumber      = parent.attr('data-part-number');

        for(previous of listPrevious) {

            // console.log(previous);

            let prevPartNumber = previous.item.title.split(' - ')[0];

            if(prevPartNumber === partNumber) {


                isAdditional = false;


                if(previous.item.link === link) {
                    if(Number(parent.attr('data-qty')) !== previous.totalQuantity) {
                        isDifferent = true;
                        // console.log(parent.attr('data-qty'));
                        // console.log(previous.totalQuantity);

                    }
                } else {
                    isDifferent = true;
                    // console.log(previous.item.link);
                    // console.log(link);
                }

            } 

            // console.log(previous.item.link);
            // if(previous.item.link === link) {
            //     isAdditional = false;
            // }
        }

        if(isNew) { status = 'new'; bomItemsByStatus.new.push(partNumber);
        } else if(isAdditional) { status = 'additional'; bomItemsByStatus.additional.push(partNumber);
        } else if(isDifferent) { status = 'different'; bomItemsByStatus.different.push(partNumber);
        } else { status = 'match'; bomItemsByStatus.match.push(partNumber); }

        parent.addClass(status);

    });

    for(previous of listPrevious) {

        let isRemoved = true;

        $('tr.bom-item').each(function() {
            let link = $(this).attr('data-link');
            if(link === previous.item.link) {
                isRemoved = false;
            }
        });

        // if(isRemoved) {
        //     let elemItem = genBOMItem(previous, fields);
        //     elemItem.addClass('removed');
        //     console.log(previous);
        //     console.log(previous.title);
        //     bomItemsByStatus.removed.push(previous.title.split(' - ')[0]);
        // }

    }

    $('#bom-status-new').css('flex-grow', bomItemsByStatus.new.length);
    $('#bom-status-additional').css('flex-grow', bomItemsByStatus.additional.length);
    $('#bom-status-different').css('flex-grow', bomItemsByStatus.different.length);
    $('#bom-status-match').css('flex-grow', bomItemsByStatus.match.length);
    $('#bom-status-removed').css('flex-grow', bomItemsByStatus.removed.length);

    //setItemColorsInViewer();

}
function genBOMItem(item, fields) {

    let elemRow = $("<tr></tr>");
    let icon = '';


    for(managedItem of managedItems) {
        if(managedItem.urn === item.item.urn) icon = '<i class="zmdi zmdi-check-circle"></i>';
    }

    // let icon = (managedItems.indexOf(item.item.urn) < 0) ? '' : '<i class="zmdi zmdi-check-circle"></i>';

    elemRow.append('<td class="bom-status"></td>');
    elemRow.append('<td>' + icon + '</td>');
    // elemRow.append(getItemLink(item.item.title, item.item.urn));
    // elemRow.append('<td class="bom-version">' + item.item.version + '</td>');
    // elemRow.append('<td class="bom-quantity">' + item.totalQuantity + '</td>');
    // elemRow.append('<td>' + item.occurrences.length + '</td>');


    // console.log(item);

    for(field of fields) {


        // console.log(field);

        let value = '';
        for(property of item.occurrences[0].fields) {
            if(property.metaData.link === field.link) {
                value = property.value;
                break;
            }
        }
        if(field.formulaField) value = decodeHtml(value);
        elemRow.append('<td>' + value + '</td>');
    }

    elemRow.appendTo($("#bom-table"));

    elemRow.attr('data-qty', item.totalQuantity);
    elemRow.attr('data-version', item.item.version);
    elemRow.attr('data-title', item.item.title);
    elemRow.attr('data-part-number', item.item.title.split(' - ')[0]);
    elemRow.attr('data-link', item.item.link);
    
    elemRow.addClass('bom-item');

    return elemRow;

}
function setItemColorsInViewer() {

    if($('#apply-to-viewer').is(":checked")) {

        viewerSetColors(bomItemsByStatus.new        , new THREE.Vector4(1,   0, 0, 0.5), false);
        viewerSetColors(bomItemsByStatus.additional , new THREE.Vector4(1,   0, 0, 0.5), false);
        viewerSetColors(bomItemsByStatus.different  , new THREE.Vector4(1, 0.5, 0, 0.5), false);
        viewerSetColors(bomItemsByStatus.match      , new THREE.Vector4(0,   1, 0, 0.5), false);

    } else {

        viewerResetColors();

    }

}


// [5] Get End Items
function getRootParents() {

    $('#roots-table').find('tbody').children().remove();
   
    $.get('/plm/where-used', { 'link' : selectedManagedItem.link }, function(response) {
        
        if(response.params.link !==  selectedManagedItem.link) return;

        let counterRoots        = 0;
        let elemTable           = $('#roots-table').find('tbody');

        if(response.data.hasOwnProperty('edges')) {
            for(edge of response.data.edges) {

                if(!edge.hasOwnProperty('edgeLink')) {

                    let urn      = edge.child;
                    let temp     = urn.split('.');
                    let edgeWSID = temp[4];
                    let wsTitle  = relatedProperty(edgeWSID, 'title');

                    if(isRelated(edgeWSID)) {

                        for(node of response.data.nodes) {
                            if(urn === node.item.urn) {

                                $.get('/plm/is-archived', { 'link' : node.item.link, 'item' : node.item }, function(response) {

                                    if(response.data === false) insertImpactedItem(response.params.item, wsTitle);

                                });

                            }
                        }

                        urn = edge.parent;

                    }

                    for(node of response.data.nodes) {

                        if(urn === node.item.urn) {

                            counterRoots++;

                            let lifecycle = '';
                            let quantity  = '';

                            for(field of node.fields) {
                                if(field.title === 'QUANTITY') quantity = field.value;
                                else if(field.title === 'LIFECYCLE') lifecycle = field.value;
                            }

                            let elemItem = $('<td></td>');
                                elemItem.html(node.item.title);
                                elemItem.addClass('tiny');
                                elemItem.addClass('link');
                                elemItem.click(function() {
                                    openItemByURN($(this).closest('tr').attr('data-urn'));
                                });

                            let elemChildren = $('<td></td>');

                            let elemRow = $('<tr></tr>');
                                // elemRow.append(getItemLink(node.item.title, node.item.urn));
                                elemRow.append(elemItem);
                                elemRow.append('<td class="tiny">' + lifecycle + '</td>');
                                elemRow.append('<td class="tiny align-right">' + quantity + '</td>');
                                elemRow.append(elemChildren);
                                elemRow.appendTo(elemTable);
                                elemRow.attr('data-urn', node.item.urn);

                            getChildren(elemChildren, response.data.edges, response.data.nodes, node.item.urn, 1);

                        }

                    }
                }
            }
        }

        setImpactedStatus();
        setCounter('roots', counterRoots);
        setCounter('impacted', $('#impacted-tbody').children().length);

    });
    
}
function getChildren(elemChildren, edges, nodes, parent, level) {

    for(edge of edges) {

        if(parent === edge.child) {

            let elemParent = $('<div></div>');
                elemParent.addClass('parent');

            let elemParentActions = $('<div></div>');
                elemParentActions.addClass('parent-actions');
                elemParentActions.appendTo(elemParent);

            let elemParentPath = $('<div></div>');
                elemParentPath.addClass('parent-path');
                elemParentPath.appendTo(elemParent);

            let isConnected = false;

            for(managedItem of managedItems) {
                if(managedItem.urn === edge.child) {
                    isConnected = true;
                    continue;
                }
            }

            if(!isConnected) {

                let elemActionAdd = $('<div></div>');
                    elemActionAdd.addClass('button');
                    elemActionAdd.html('Add');
                    elemActionAdd.appendTo(elemParentActions);
                    elemActionAdd.click(function() {
                        $('#overlay').show();
                        let link = $(this).closest('.parent').attr('data-link');
                        let items = [link];
                        $.get('/plm/add-managed-items', { 'wsId' : wsId , 'dmsId' : dmsId, 'items' : items }, function() {
                            $('#overlay').hide();
                            $('.parent').each(function() {
                                if(link === $(this).attr('data-link')) {
                                    $(this).find('.button').remove();
                                }
                            });
                            getManagedItems();
                        });  
                    });
            }
                
            for(let i = level - 1; i > 0; i--) { elemParentPath.append('<span class="material-symbols-sharp">trending_flat</span>'); }

            for(node of nodes) {
                if(parent === node.item.urn) {
                    elemParent.attr('data-urn', node.item.urn);
                    elemParent.attr('data-link', node.item.link);
                    elemParentPath.append(node.item.title);
                    elemParentPath.click(function() {
                        openItemByURN($(this).parent().attr('data-urn'));
                    })
                }
            }

            elemChildren.append(elemParent);
            getChildren(elemChildren, edges, nodes, edge.parent, level+1);

        }

    }

}
function isRelated(id) {

    for(workspace of relatedWorkspaces) {
        if(workspace.wsId === id) return true;
    }

    return false;

}
function relatedProperty(id, property) {

    for(workspace of relatedWorkspaces) {
        if(workspace.wsId === id) return workspace[property];
    }

    return '';

}
function getImpactedRelationships() {

    $.get('/plm/relationships', { 'link' : selectedManagedItem.link }, function(response) {

        if(response.params.link  !== selectedManagedItem.link) return;

        for(relationship of response.data) {
            insertImpactedItem(relationship.item, relationship.workspace.title);
        }
        
        $('#overlay').hide();
        
    });
    
}
function insertImpactedItem(item, workspace) {

    let elemTableBody = $('#impacted-tbody');
    let itemWSID      = item.link.split('/')[4];
    let itemDMSID     = item.link.split('/')[6];

    if(isRelated(itemWSID)) {

        let elemTitle = $('<td></td>');
            elemTitle.addClass('link');
            elemTitle.addClass('tiny');
            elemTitle.html(item.title);
            elemTitle.click(function() {
                openItemByURN($(this).closest('tr').attr('data-urn'));
            });

        let elemStatus = $('<td class="impacted-status tiny"><span class="material-symbols-sharp">link</spn></td>');

        let elemInput = $('<td></td>');
            elemInput.html('<input class="rel-desc" value="">');

        let elemActionLink = $('<div></div>');
            elemActionLink.addClass('button');
            elemActionLink.addClass('default');
            elemActionLink.addClass('impacted-connect');
            elemActionLink.html('Connect');
            elemActionLink.click(function() {
                addRelationship($(this));
            });
                
        let elemActionUnlink = $('<div></div>');
            elemActionUnlink.addClass('button');
            elemActionUnlink.addClass('impacted-disconnect');
            elemActionUnlink.html('Disconnect');
            elemActionUnlink.click(function() {
                removeRelationship($(this));
            });

        let elemActionUpdate = $('<div></div>');
            elemActionUpdate.addClass('button');
            elemActionUpdate.addClass('impacted-update');
            elemActionUpdate.html('Update');
            elemActionUpdate.click(function() {
                updateRelationship($(this));
            });

        let elemActions = $('<td></td>');
            elemActions.addClass('impacted-actions');
            elemActions.append(elemActionLink);
            elemActions.append(elemActionUnlink);
            elemActions.append(elemActionUpdate);

        let elemImpacted = $('<tr></tr>');
            elemImpacted.attr('data-id', itemDMSID);
            elemImpacted.attr('data-urn', item.urn);
            elemImpacted.addClass('impacted-item');
            elemImpacted.append(elemStatus);
            elemImpacted.append('<td class="tiny">' + workspace + '</td>');
            elemImpacted.append(elemTitle);
            elemImpacted.append(elemInput);
            elemImpacted.append(elemActions);
            elemImpacted.appendTo(elemTableBody);

        setImpactedStatus();
        setCounter('impacted', $('#impacted-tbody').children().length, true);

    }
}


// [6] Manage Relationships
function addRelationship(elemButton) {

    $('#overlay').show();

    let elemRow = elemButton.closest('tr');
    let description = elemRow.find('input').first().val();

    let params = {
        'wsId'          : wsId, 
        'dmsId'         : dmsId,
        'relatedId'     : elemRow.attr('data-id'),
        'description'   : description,
        'type'          : 'bi'
    }

    $.get('/plm/add-relationship', params, function() {
        getRelationships(function() {
            setImpactedStatus();
            $('#overlay').hide();
        });
    });

}
function removeRelationship(elemButton) {

    $('#overlay').show();

    let urn  = elemButton.closest('tr').attr('data-urn');
    let link = '';

    for(relatedItem of relatedItems){
        if(relatedItem.urn === urn) {
            link = relatedItem.link;
            break;
        }
    }

    if(link === '') return;

    $.get('/plm/remove-relationship', { 'link' : link }, function() {
        getRelationships(function() {
            setImpactedStatus();
            $('#overlay').hide();
        });
    });

}
function updateRelationship(elemButton) {

    $('#overlay').show();

    let urn = elemButton.closest('tr').attr('data-urn');
    let desc = elemButton.closest('tr').find('input').val();
    let link = '';

    for(relatedItem of relatedItems){
        if(relatedItem.urn === urn) {
            link = relatedItem.link;
            break;
        }
    }

    if(link === '') return;

    $.get('/plm/update-relationship', { 'link' : link, 'description' : desc }, function() {
        getRelationships(function() {
            setImpactedStatus();
            $('#overlay').hide();
        });
    });

}
function setImpactedStatus() {

    $('.impacted-item').each(function() {
        
        let urn       = $(this).attr('data-urn');
        let className = 'disconnected';
        let description = '';

        for(relatedItem of relatedItems) {
            if(relatedItem.urn === urn) {
                className = 'connected';
                description = relatedItem.description;
                break;
            }
        }

        $(this).removeClass('disconnected');
        $(this).removeClass('connected');
        $(this).addClass(className);
        $(this).find('input').val(description);

    });

}


// [7] Get related changed items
function getRelated() {
    
    $.get('/plm/related-items', { 'link' : selectedManagedItem.link, 'relatedWSID' : wsId }, function(response) {

        if(response.params.link  !== selectedManagedItem.link) return;

        let elemList  = $('#related-list');
            elemList.html('');

        $('#related-counter').html('');
        $('#related-counter').parent().removeClass('counter-done').removeClass('counter-none').addClass('counter-work');

        for(relatedItem of response.data) {
            
            let elemItem = $('<div></div>');
                elemItem.attr('data-title', relatedItem.title);
                elemItem.attr('data-part-number', relatedItem.title.split(' - ')[0]);
                elemItem.attr('data-link', relatedItem.link);
                elemItem.addClass('changed-item');
                elemItem.appendTo(elemList);
                elemItem.click(function() {
                    $(this).toggleClass('selected');
                    console.log($(this).attr('data-part-number'));
                    if($(this).hasClass('selected')) {
                        viewerSelectModel($(this).attr('data-part-number'), true);
                    } else {
                        resetViewerSelection(true);
                    }
                });

            let elemItemTitle = $('<div></div>');
                elemItemTitle.addClass('changed-item-title');
                elemItemTitle.html(relatedItem.title);
                elemItemTitle.appendTo(elemItem);

            let elemItemLifecycle = $('<div></div>');
                elemItemLifecycle.addClass('changed-item-detail');
                elemItemLifecycle.html(relatedItem.lifecycle);
                elemItemLifecycle.appendTo(elemItem);

            let elemItemVersion = $('<div></div>');
                elemItemVersion.addClass('changed-item-detail');
                elemItemVersion.html(relatedItem.version);
                elemItemVersion.appendTo(elemItem);
                
        }
            
        setCounter('related', response.data.length);

        $('#overlay').hide();
        
    });
    
}
function addManagedItem(all) {

    let selectedManagedItem;
    let items = [];

    for(managedItem of managedItems) {
        if(managedItem.urn === selectedURN) selectedManagedItem = managedItem;
    }

    $('.changed-item').each(function() {
        if(all === true || $(this).hasClass('selected')) items.push($(this).attr('data-link'));
    })

    if(items.length === 0) return;

    $('#overlay').show();

    $.get('/plm/add-managed-items', { 'wsId' : wsId , 'dmsId' : dmsId, 'items' : items }, function() {
        getRelated();
        getManagedItems();
    });    

}


// [8] Get item attachments
function getAttachments() {

    let promises = [ $.get('/plm/attachments', { 'link' : selectedManagedItem.link }) ];
    
    if(selectedManagedItem.prevLink !== '') promises.push($.get('/plm/attachments', { 'link' : selectedManagedItem.prevLink }));

    Promise.all(promises).then(function(responses) {

        let response = responses[0];

        if(response.params.link !== selectedManagedItem.link) return;

        let elemTable   = $('#attachments-table').find('tbody');

        for(attachment of response.data) {
            
            let timeStamp   = new Date(attachment.created.timeStamp);
            let description = (typeof attachment.description === 'undefined') ? '' : attachment.description;
            let elemIcon    = $('<td class="tiny"></td>').append(getFileGrahpic(attachment));
            let status      = 'New';
            let className   = 'status-new';

            if(responses.length > 1) {
                for(prevAttachment of responses[1].data) {
                    if(prevAttachment.name === attachment.name) {
                        if(attachment.version === 1) {
                            status = 'Changed';
                            className = 'status-changed'
                        }
                    }
                }
            }
            
            let elemRow = $('<tr></tr>');
                elemRow.append(elemIcon);
                elemRow.append('<td>' + attachment.name + '</td>');
                // elemRow.append('<td>' + attachment.resourceName + '</td>');
                elemRow.append('<td class="' + className + '">' + status + '</td>');
                elemRow.append('<td class="tiny align-right">' + attachment.version + '</td>');
                elemRow.append('<td class="tiny">' + timeStamp.toLocaleString() + '</td>');
                elemRow.append('<td class="tiny">' + attachment.created.user.title + '</td>');
                elemRow.append('<td class="tiny">' + description + '</td>');
                elemRow.append('<td class="tiny">' + attachment.type.fileType + '</td>');
                elemRow.appendTo(elemTable);
                elemRow.addClass('link');
                elemRow.attr('data-url', attachment.url);
                elemRow.click(function() {
                    openURL($(this).attr('data-url'));
                });
                
        }

        setCounter('attachments', response.data.length);

    });

    // $.get('/plm/attachments', { 'link' : selectedManagedItem.link }, function(response) {
    
    //     if(response.params.link !== selectedManagedItem.link) return;

    //     let elemTable   = $('#attachments-table').find('tbody');

    //     for(attachment of response.data) {
            
    //         let timeStamp = new Date(attachment.created.timeStamp);
    //         let description = (typeof attachment.description === 'undefined') ? '' : attachment.description;
    //         let elemIcon = $('<td class="tiny"></td>').append(getFileGrahpic(attachment));
            
    //         let elemRow = $('<tr></tr>');
    //             elemRow.append(elemIcon);
    //             elemRow.append('<td>' + attachment.name + '</td>');
    //             elemRow.append('<td>' + attachment.resourceName + '</td>');
    //             elemRow.append('<td class="tiny align-right">' + attachment.version + '</td>');
    //             elemRow.append('<td class="tiny">' + timeStamp.toLocaleString() + '</td>');
    //             elemRow.append('<td class="tiny">' + attachment.created.user.title + '</td>');
    //             elemRow.append('<td class="tiny">' + description + '</td>');
    //             elemRow.append('<td class="tiny">' + attachment.type.fileType + '</td>');
    //             elemRow.appendTo(elemTable);
    //             elemRow.addClass('link');
    //             elemRow.attr('data-url', attachment.url);
    //             elemRow.click(function() {
    //                 openURL($(this).attr('data-url'));
    //             });
                
    //     }

    //     setCounter('attachments', response.data.length);
        
    // });
    
}


// [9] Get related Change Processes
function getChangeProcesses() {

    $.get('/plm/changes', { 'link' : selectedManagedItem.link }, function(response) {
        
        if(response.params.link !== selectedManagedItem.link) return;

        let elemTable = $('#changes-table').find('tbody');
        
        for(process of response.data) {
         
            let dateCreate = new Date(process['first-workflow-history'].created);
            let dateUpdate = new Date(process['last-workflow-history'].created);           

            let elemRow = $('<tr></tr>');
                elemRow.append('<td>' + process.item.title + '</td>');
                elemRow.append('<td class="tiny">' + process['workflow-state'].title + '</td>');
                elemRow.append('<td class="tiny">' + dateCreate.toLocaleString() + '</td>');
                elemRow.append('<td>' + process['last-workflow-history'].user.title + '</td>');
                elemRow.append('<td class="tiny">' + dateUpdate.toLocaleString() + '</td>');
                elemRow.append('<td>' + process['first-workflow-history'].user.title + '</td>');
                elemRow.appendTo(elemTable);
                elemRow.addClass('link');
                elemRow.attr('data-urn', process.item.urn);
                elemRow.click(function() {
                    openItemByURN($(this).attr('data-urn'));
                });
                
        }
        
        setCounter('changes', response.data.length);
        
    });  

}